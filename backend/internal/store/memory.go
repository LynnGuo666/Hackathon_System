package store

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"hackathon-system/backend/internal/models"
)

var (
	ErrNotFound         = errors.New("not found")
	ErrDuplicateEmail   = errors.New("email is already bound")
	ErrDuplicateCheckin = errors.New("checkin id is already bound")
	ErrAlreadyAssigned  = errors.New("resource already assigned to participant")
	ErrNoResource       = errors.New("no available resource item")
)

type MemoryStore struct {
	mu sync.Mutex

	participantsByCheckin map[string]*models.Participant
	participantsByEmail   map[string]*models.Participant
	codes                 map[string]*models.VerificationCode
	pools                 map[string]*models.ResourcePool
	items                 map[string]*models.ResourceItem
	assignments           map[string]*models.ResourceAssignment
	assignmentByPoolUser  map[string]string
	emails                map[string]*models.EmailOutbox
	audits                []*models.AuditLog
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		participantsByCheckin: map[string]*models.Participant{},
		participantsByEmail:   map[string]*models.Participant{},
		codes:                 map[string]*models.VerificationCode{},
		pools:                 map[string]*models.ResourcePool{},
		items:                 map[string]*models.ResourceItem{},
		assignments:           map[string]*models.ResourceAssignment{},
		assignmentByPoolUser:  map[string]string{},
		emails:                map[string]*models.EmailOutbox{},
		audits:                []*models.AuditLog{},
	}
}

func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func NewID(prefix string) string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return fmt.Sprintf("%s_%s", prefix, hex.EncodeToString(b[:]))
}

func (s *MemoryStore) UpsertVerificationCode(code *models.VerificationCode) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	clone := *code
	clone.Email = NormalizeEmail(code.Email)
	s.codes[clone.Email] = &clone
	return nil
}

func (s *MemoryStore) GetVerificationCode(email string) (*models.VerificationCode, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	code, ok := s.codes[NormalizeEmail(email)]
	if !ok {
		return nil, false
	}
	clone := *code
	return &clone, true
}

func (s *MemoryStore) MarkVerificationUsed(email string, usedAt time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if code, ok := s.codes[NormalizeEmail(email)]; ok {
		code.UsedAt = usedAt
	}
	return nil
}

func (s *MemoryStore) IncrementVerificationAttempt(email string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if code, ok := s.codes[NormalizeEmail(email)]; ok {
		code.AttemptCount++
	}
	return nil
}

func (s *MemoryStore) BindParticipant(email, checkinID string, now time.Time) (*models.Participant, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	email = NormalizeEmail(email)
	checkinID = strings.TrimSpace(checkinID)
	if email == "" || checkinID == "" {
		return nil, errors.New("email and checkin id are required")
	}
	if existing, ok := s.participantsByCheckin[checkinID]; ok && existing.Email != email {
		return nil, ErrDuplicateCheckin
	}
	if existing, ok := s.participantsByEmail[email]; ok && existing.CheckinID != "" && existing.CheckinID != checkinID {
		return nil, ErrDuplicateEmail
	}
	if existing, ok := s.participantsByCheckin[checkinID]; ok {
		clone := *existing
		return &clone, nil
	}
	if existing, ok := s.participantsByEmail[email]; ok && existing.CheckinID == "" {
		existing.CheckinID = checkinID
		existing.CheckedInAt = now
		existing.Status = models.ParticipantActive
		existing.UpdatedAt = now
		s.participantsByCheckin[checkinID] = existing
		clone := *existing
		return &clone, nil
	}

	p := &models.Participant{
		ID:              NewID("par"),
		CheckinID:       checkinID,
		Email:           email,
		EmailVerifiedAt: now,
		CheckedInAt:     now,
		Status:          models.ParticipantActive,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	s.participantsByCheckin[checkinID] = p
	s.participantsByEmail[email] = p
	clone := *p
	return &clone, nil
}

func (s *MemoryStore) UpsertPreEventParticipant(email string, now time.Time) (*models.Participant, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	email = NormalizeEmail(email)
	if existing, ok := s.participantsByEmail[email]; ok {
		clone := *existing
		return &clone, nil
	}
	p := &models.Participant{
		ID:              NewID("par"),
		Email:           email,
		EmailVerifiedAt: now,
		Status:          models.ParticipantPending,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	s.participantsByEmail[email] = p
	clone := *p
	return &clone, nil
}

func (s *MemoryStore) GetParticipantByEmail(email string) (*models.Participant, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.participantsByEmail[NormalizeEmail(email)]
	if !ok {
		return nil, ErrNotFound
	}
	clone := *p
	return &clone, nil
}

func (s *MemoryStore) GetParticipantByCheckinID(checkinID string) (*models.Participant, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.participantsByCheckin[strings.TrimSpace(checkinID)]
	if !ok {
		return nil, ErrNotFound
	}
	clone := *p
	return &clone, nil
}

func (s *MemoryStore) CreateResourcePool(input models.ResourcePool) (models.ResourcePool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	input.ID = NewID("pool")
	input.CreatedAt = time.Now()
	if input.DistributionRule == "" {
		input.DistributionRule = models.DistributionOnePerParticipant
	}
	if input.VisiblePhase == "" {
		input.VisiblePhase = models.VisibleAll
	}
	input.Enabled = true
	s.pools[input.ID] = &input
	return input, nil
}

func (s *MemoryStore) ListResourcePools() ([]models.ResourcePool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]models.ResourcePool, 0, len(s.pools))
	for _, pool := range s.pools {
		out = append(out, *pool)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.Before(out[j].CreatedAt) })
	return out, nil
}

func (s *MemoryStore) AddResourceItem(poolID, plainCode, label string, expiresAt time.Time) (models.ResourceItem, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.pools[poolID]; !ok {
		return models.ResourceItem{}, ErrNotFound
	}
	item := models.ResourceItem{
		ID:             NewID("item"),
		PoolID:         poolID,
		CodeCiphertext: encryptForMVP(plainCode),
		PublicLabel:    label,
		Status:         models.ResourceAvailable,
		ExpiresAt:      expiresAt,
	}
	s.items[item.ID] = &item
	return item, nil
}

func (s *MemoryStore) ListResourceItems(poolID string) ([]models.ResourceItem, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := []models.ResourceItem{}
	for _, item := range s.items {
		if poolID == "" || item.PoolID == poolID {
			clone := *item
			clone.CodeCiphertext = ""
			out = append(out, clone)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out, nil
}

func (s *MemoryStore) ClaimResource(poolID, checkinID string, now time.Time) (models.ResourceAssignment, string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.participantsByCheckin[checkinID]; !ok {
		return models.ResourceAssignment{}, "", ErrNotFound
	}
	pool, ok := s.pools[poolID]
	if !ok || !pool.Enabled {
		return models.ResourceAssignment{}, "", ErrNotFound
	}
	key := poolID + ":" + checkinID
	if id, ok := s.assignmentByPoolUser[key]; ok {
		return *s.assignments[id], "", ErrAlreadyAssigned
	}
	var selected *models.ResourceItem
	for _, item := range s.items {
		if item.PoolID == poolID && item.Status == models.ResourceAvailable {
			selected = item
			break
		}
	}
	if selected == nil {
		return models.ResourceAssignment{}, "", ErrNoResource
	}

	selected.Status = models.ResourceAssigned
	selected.AssignedCheckinID = checkinID
	selected.AssignedAt = now
	assignment := &models.ResourceAssignment{
		ID:             NewID("asg"),
		CheckinID:      checkinID,
		PoolID:         poolID,
		ResourceItemID: selected.ID,
		Status:         models.AssignmentAssigned,
		CreatedAt:      now,
		PlainCode:      decryptForMVP(selected.CodeCiphertext),
	}
	s.assignments[assignment.ID] = assignment
	s.assignmentByPoolUser[key] = assignment.ID
	return *assignment, assignment.PlainCode, nil
}

func (s *MemoryStore) ListAssignments(checkinID string) ([]models.ResourceAssignment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := []models.ResourceAssignment{}
	for _, assignment := range s.assignments {
		if checkinID == "" || assignment.CheckinID == checkinID {
			clone := *assignment
			if item, ok := s.items[assignment.ResourceItemID]; ok {
				clone.PlainCode = decryptForMVP(item.CodeCiphertext)
			}
			out = append(out, clone)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.Before(out[j].CreatedAt) })
	return out, nil
}

func (s *MemoryStore) MarkAssignmentDelivered(id string, now time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	assignment, ok := s.assignments[id]
	if !ok {
		return ErrNotFound
	}
	assignment.Status = models.AssignmentDelivered
	assignment.DeliveredByEmail = true
	assignment.DeliveredAt = now
	return nil
}

func (s *MemoryStore) EnqueueEmail(to, subject, body string, now time.Time) (models.EmailOutbox, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	email := models.EmailOutbox{
		ID:        NewID("mail"),
		To:        NormalizeEmail(to),
		Subject:   subject,
		Body:      body,
		Status:    models.EmailPending,
		CreatedAt: now,
		UpdatedAt: now,
	}
	s.emails[email.ID] = &email
	return email, nil
}

func (s *MemoryStore) ListEmails() ([]models.EmailOutbox, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]models.EmailOutbox, 0, len(s.emails))
	for _, email := range s.emails {
		out = append(out, *email)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.Before(out[j].CreatedAt) })
	return out, nil
}

func (s *MemoryStore) RetryEmail(id string, now time.Time) (models.EmailOutbox, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	email, ok := s.emails[id]
	if !ok {
		return models.EmailOutbox{}, ErrNotFound
	}
	if email.Status == models.EmailSent {
		return models.EmailOutbox{}, errors.New("sent email cannot be retried")
	}
	email.Status = models.EmailPending
	email.RetryCount++
	email.LastError = ""
	email.UpdatedAt = now
	return *email, nil
}

func (s *MemoryStore) RecordAudit(actorID, action, targetType, targetID, reason string, now time.Time) (models.AuditLog, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	log := &models.AuditLog{
		ID:         NewID("aud"),
		ActorID:    actorID,
		Action:     action,
		TargetType: targetType,
		TargetID:   targetID,
		Reason:     reason,
		CreatedAt:  now,
	}
	s.audits = append(s.audits, log)
	return *log, nil
}

func (s *MemoryStore) ListAudits() ([]models.AuditLog, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]models.AuditLog, 0, len(s.audits))
	for _, log := range s.audits {
		out = append(out, *log)
	}
	return out, nil
}

func encryptForMVP(value string) string {
	return hex.EncodeToString([]byte(value))
}

func decryptForMVP(value string) string {
	bytes, err := hex.DecodeString(value)
	if err != nil {
		return ""
	}
	return string(bytes)
}
