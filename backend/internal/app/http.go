package app

import (
	"encoding/csv"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"douyin-hackathon-system/backend/internal/auth"
	"douyin-hackathon-system/backend/internal/models"
	"douyin-hackathon-system/backend/internal/store"
)

type Server struct {
	service *Service
	mux     *http.ServeMux
}

func NewServer(service *Service) *Server {
	server := &Server{service: service, mux: http.NewServeMux()}
	server.routes()
	return server
}

func (s *Server) Handler() http.Handler {
	return withCORS(s.mux)
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /api/health", s.health)
	s.mux.HandleFunc("POST /api/auth/send-code", s.sendCode)
	s.mux.HandleFunc("POST /api/auth/verify-code", s.verifyCode)
	s.mux.HandleFunc("POST /api/auth/bind-checkin", s.bindCheckin)
	s.mux.HandleFunc("GET /api/me", s.me)

	s.mux.HandleFunc("GET /api/resources", s.resources)
	s.mux.HandleFunc("POST /api/resources/{poolId}/claim", s.claimResource)
	s.mux.HandleFunc("POST /api/resources/{assignmentId}/resend-email", s.resendEmail)

	s.mux.HandleFunc("GET /api/admin/resources/pools", s.adminPools)
	s.mux.HandleFunc("POST /api/admin/resources/pools", s.adminPools)
	s.mux.HandleFunc("POST /api/admin/resources/pools/{id}/items/import", s.importItems)
	s.mux.HandleFunc("GET /api/admin/resources/pools/{id}/items", s.listItems)
	s.mux.HandleFunc("GET /api/admin/resources/assignments", s.listAssignments)
	s.mux.HandleFunc("POST /api/admin/resources/pools/{id}/assign", s.adminAssign)
	s.mux.HandleFunc("POST /api/admin/resources/assignments/{id}/resend-email", s.resendEmail)

	s.mux.HandleFunc("GET /api/admin/email-outbox", s.emailOutbox)
	s.mux.HandleFunc("POST /api/admin/email-outbox/{id}/retry", s.retryEmail)
	s.mux.HandleFunc("GET /api/admin/audit-logs", s.auditLogs)
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) sendCode(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email string `json:"email"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	if err := s.service.SendCode(input.Email); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "queued"})
}

func (s *Server) verifyCode(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	if err := s.service.VerifyCode(input.Email, input.Code); err != nil {
		writeError(w, err)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "participant_email",
		Value:    store.NormalizeEmail(input.Email),
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(24 * time.Hour),
	})
	writeJSON(w, http.StatusOK, map[string]string{"status": "verified"})
}

func (s *Server) bindCheckin(w http.ResponseWriter, r *http.Request) {
	email := participantEmail(r)
	var input struct {
		CheckinID string `json:"checkinId"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	participant, err := s.service.BindCheckin(email, input.CheckinID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, participant)
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	participant, err := s.service.Me(participantEmail(r))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, participant)
}

func (s *Server) resources(w http.ResponseWriter, r *http.Request) {
	participant, err := s.service.Me(participantEmail(r))
	if err != nil {
		writeError(w, err)
		return
	}
	assignments, err := s.service.MyResources(participant.CheckinID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, assignments)
}

func (s *Server) claimResource(w http.ResponseWriter, r *http.Request) {
	participant, err := s.service.Me(participantEmail(r))
	if err != nil {
		writeError(w, err)
		return
	}
	assignment, err := s.service.ClaimResource(participant.CheckinID, r.PathValue("poolId"), participant.CheckinID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, assignment)
}

func (s *Server) adminPools(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		pools, err := s.service.ListPools()
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, pools)
		return
	}
	if !requireResourceAdmin(w, r) {
		return
	}
	var input models.ResourcePool
	if !decodeJSON(w, r, &input) {
		return
	}
	pool, err := s.service.CreatePool(auth.ActorID(r), input)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, pool)
}

func (s *Server) importItems(w http.ResponseWriter, r *http.Request) {
	if !requireResourceAdmin(w, r) {
		return
	}
	var codes []string
	if strings.Contains(r.Header.Get("Content-Type"), "text/csv") {
		records, err := csv.NewReader(r.Body).ReadAll()
		if err != nil {
			writeError(w, err)
			return
		}
		for _, record := range records {
			if len(record) > 0 {
				codes = append(codes, record[0])
			}
		}
	} else {
		var input struct {
			Codes []string `json:"codes"`
		}
		if !decodeJSON(w, r, &input) {
			return
		}
		codes = input.Codes
	}
	items, err := s.service.ImportResourceCodes(auth.ActorID(r), r.PathValue("id"), codes)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, items)
}

func (s *Server) listItems(w http.ResponseWriter, r *http.Request) {
	items, err := s.service.store.ListResourceItems(r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) listAssignments(w http.ResponseWriter, r *http.Request) {
	assignments, err := s.service.AllResources()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, assignments)
}

func (s *Server) adminAssign(w http.ResponseWriter, r *http.Request) {
	if !requireResourceAdmin(w, r) {
		return
	}
	var input struct {
		CheckinID string `json:"checkinId"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	assignment, err := s.service.ClaimResource(auth.ActorID(r), r.PathValue("id"), input.CheckinID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, assignment)
}

func (s *Server) resendEmail(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "queued", "note": "resource email resend is tracked through email outbox retry"})
}

func (s *Server) emailOutbox(w http.ResponseWriter, r *http.Request) {
	emails, err := s.service.ListEmails()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, emails)
}

func (s *Server) retryEmail(w http.ResponseWriter, r *http.Request) {
	if !requireEmailAdmin(w, r) {
		return
	}
	email, err := s.service.RetryEmail(auth.ActorID(r), r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, email)
}

func (s *Server) auditLogs(w http.ResponseWriter, r *http.Request) {
	logs, err := s.service.ListAudits()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, logs)
}

func participantEmail(r *http.Request) string {
	if email := r.Header.Get("X-Participant-Email"); email != "" {
		return store.NormalizeEmail(email)
	}
	if cookie, err := r.Cookie("participant_email"); err == nil {
		return store.NormalizeEmail(cookie.Value)
	}
	return ""
}

func requireResourceAdmin(w http.ResponseWriter, r *http.Request) bool {
	if auth.CanManageResources(auth.RoleFromRequest(r)) {
		return true
	}
	writeError(w, ErrPermissionDenied)
	return false
}

func requireEmailAdmin(w http.ResponseWriter, r *http.Request) bool {
	if auth.CanRetryEmail(auth.RoleFromRequest(r)) {
		return true
	}
	writeError(w, ErrPermissionDenied)
	return false
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dest any) bool {
	defer r.Body.Close()
	if err := json.NewDecoder(r.Body).Decode(dest); err != nil {
		writeError(w, err)
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, err error) {
	status := http.StatusBadRequest
	switch {
	case errors.Is(err, ErrLoginRequired):
		status = http.StatusUnauthorized
	case errors.Is(err, ErrPermissionDenied):
		status = http.StatusForbidden
	case errors.Is(err, store.ErrNotFound):
		status = http.StatusNotFound
	case errors.Is(err, store.ErrDuplicateEmail), errors.Is(err, store.ErrDuplicateCheckin), errors.Is(err, store.ErrAlreadyAssigned):
		status = http.StatusConflict
	}
	writeJSON(w, status, map[string]string{"error": err.Error()})
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Admin-Role, X-Actor-ID, X-Participant-Email")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
