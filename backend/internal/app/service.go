package app

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math/rand/v2"
	"net/mail"
	"strings"
	"time"

	"hackathon-system/backend/internal/mailer"
	"hackathon-system/backend/internal/models"
	"hackathon-system/backend/internal/store"
)

var (
	ErrInvalidEmail       = errors.New("invalid email")
	ErrInvalidCode        = errors.New("invalid or expired code")
	ErrTooManyAttempts    = errors.New("too many verification attempts")
	ErrLoginRequired      = errors.New("login required")
	ErrPermissionDenied   = errors.New("permission denied")
	ErrInvalidCheckinID   = errors.New("invalid checkin id")
	ErrInvalidResourceCSV = errors.New("resource csv must contain at least one code")
	ErrInvalidProfile     = errors.New("profile requires full name, team name, school, and phone")
	ErrInvalidNavigation  = errors.New("navigation link requires title and url")
)

type Service struct {
	store store.Store
	now   func() time.Time
}

func NewService(store store.Store) *Service {
	return &Service{store: store, now: time.Now}
}

func (s *Service) SendCode(email string) error {
	email = store.NormalizeEmail(email)
	if _, err := mail.ParseAddress(email); err != nil {
		return ErrInvalidEmail
	}
	now := s.now()
	code := fmt.Sprintf("%06d", rand.IntN(1000000))
	verification := &models.VerificationCode{
		Email:        email,
		CodeHash:     hashCode(code),
		ExpiresAt:    now.Add(10 * time.Minute),
		LastSentAt:   now,
		AttemptCount: 0,
	}
	if err := s.store.UpsertVerificationCode(verification); err != nil {
		return err
	}
	_, err := s.store.EnqueueEmail(email, mailer.VerificationSubject(), mailer.VerificationBody(code), now)
	return err
}

func (s *Service) VerifyCode(email, code string) error {
	email = store.NormalizeEmail(email)
	verification, ok := s.store.GetVerificationCode(email)
	if !ok {
		return ErrInvalidCode
	}
	if verification.AttemptCount >= 5 {
		return ErrTooManyAttempts
	}
	if !verification.UsedAt.IsZero() || s.now().After(verification.ExpiresAt) || verification.CodeHash != hashCode(code) {
		_ = s.store.IncrementVerificationAttempt(email)
		return ErrInvalidCode
	}
	if err := s.store.MarkVerificationUsed(email, s.now()); err != nil {
		return err
	}
	_, err := s.store.UpsertPreEventParticipant(email, s.now())
	return err
}

func (s *Service) BindCheckin(email, checkinID string) (*models.Participant, error) {
	if email == "" {
		return nil, ErrLoginRequired
	}
	checkinID = strings.TrimSpace(checkinID)
	if len(checkinID) < 4 || len(checkinID) > 64 {
		return nil, ErrInvalidCheckinID
	}
	participant, err := s.store.BindParticipant(email, checkinID, s.now())
	if err != nil {
		return nil, err
	}
	_, err = s.store.EnqueueEmail(participant.Email, mailer.CheckinBoundSubject(), mailer.CheckinBoundBody(participant.CheckinID), s.now())
	if err != nil {
		return nil, err
	}
	_, _ = s.store.RecordAudit(participant.CheckinID, "participant.bind_checkin", "participant", participant.CheckinID, "", s.now())
	return participant, nil
}

func (s *Service) Me(email string) (*models.Participant, error) {
	if email == "" {
		return nil, ErrLoginRequired
	}
	return s.store.GetParticipantByEmail(email)
}

func (s *Service) SaveProfile(email string, input models.ParticipantProfile) (models.ParticipantProfile, error) {
	if email == "" {
		return models.ParticipantProfile{}, ErrLoginRequired
	}
	input = trimProfile(input)
	if input.FullName == "" || input.TeamName == "" || input.School == "" || input.Phone == "" {
		return models.ParticipantProfile{}, ErrInvalidProfile
	}
	if _, err := s.store.GetParticipantByEmail(email); err != nil {
		return models.ParticipantProfile{}, err
	}
	profile, err := s.store.UpsertParticipantProfile(email, input, s.now())
	if err != nil {
		return models.ParticipantProfile{}, err
	}
	_, _ = s.store.RecordAudit(email, "participant.profile_upsert", "participant_profile", email, "", s.now())
	return profile, nil
}

func (s *Service) Profile(email string) (models.ParticipantProfile, error) {
	if email == "" {
		return models.ParticipantProfile{}, ErrLoginRequired
	}
	return s.store.GetParticipantProfile(email)
}

func (s *Service) ListProfiles() ([]models.ParticipantProfile, error) {
	return s.store.ListParticipantProfiles()
}

func (s *Service) CreatePool(actorID string, input models.ResourcePool) (models.ResourcePool, error) {
	pool, err := s.store.CreateResourcePool(input)
	if err != nil {
		return models.ResourcePool{}, err
	}
	_, _ = s.store.RecordAudit(actorID, "resource_pool.create", "resource_pool", pool.ID, "", s.now())
	return pool, nil
}

func (s *Service) ListPools() ([]models.ResourcePool, error) {
	return s.store.ListResourcePools()
}

func (s *Service) ImportResourceCodes(actorID, poolID string, codes []string) ([]models.ResourceItem, error) {
	if len(codes) == 0 {
		return nil, ErrInvalidResourceCSV
	}
	items := make([]models.ResourceItem, 0, len(codes))
	for index, code := range codes {
		code = strings.TrimSpace(code)
		if code == "" {
			continue
		}
		item, err := s.store.AddResourceItem(poolID, code, fmt.Sprintf("兑换码 %03d", index+1), time.Time{})
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	_, _ = s.store.RecordAudit(actorID, "resource_item.import", "resource_pool", poolID, fmt.Sprintf("imported=%d", len(items)), s.now())
	return items, nil
}

func (s *Service) ClaimResource(actorID, poolID, checkinID string) (models.ResourceAssignment, error) {
	if strings.TrimSpace(checkinID) == "" {
		return models.ResourceAssignment{}, ErrInvalidCheckinID
	}
	assignment, plainCode, err := s.store.ClaimResource(poolID, checkinID, s.now())
	if err != nil {
		return models.ResourceAssignment{}, err
	}
	pools, _ := s.store.ListResourcePools()
	poolName := "资源"
	for _, pool := range pools {
		if pool.ID == poolID {
			poolName = pool.Name
			break
		}
	}
	participant, err := s.participantByCheckin(checkinID)
	if err == nil {
		_, _ = s.store.EnqueueEmail(participant.Email, mailer.ResourceAssignedSubject(poolName), mailer.ResourceAssignedBody(poolName, plainCode), s.now())
	}
	_, _ = s.store.RecordAudit(actorID, "resource.assign", "resource_assignment", assignment.ID, "", s.now())
	return assignment, nil
}

func (s *Service) MyResources(checkinID string) ([]models.ResourceAssignment, error) {
	return s.store.ListAssignments(checkinID)
}

func (s *Service) AllResources() ([]models.ResourceAssignment, error) {
	return s.store.ListAssignments("")
}

func (s *Service) ListEmails() ([]models.EmailOutbox, error) {
	return s.store.ListEmails()
}

func (s *Service) RetryEmail(actorID, id string) (models.EmailOutbox, error) {
	email, err := s.store.RetryEmail(id, s.now())
	if err != nil {
		return models.EmailOutbox{}, err
	}
	_, _ = s.store.RecordAudit(actorID, "email.retry", "email_outbox", id, "", s.now())
	return email, nil
}

func (s *Service) ListAudits() ([]models.AuditLog, error) {
	return s.store.ListAudits()
}

func (s *Service) CreateNavigationLink(actorID string, input models.NavigationLink) (models.NavigationLink, error) {
	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	input.URL = strings.TrimSpace(input.URL)
	if input.Title == "" || input.URL == "" {
		return models.NavigationLink{}, ErrInvalidNavigation
	}
	link, err := s.store.CreateNavigationLink(input, s.now())
	if err != nil {
		return models.NavigationLink{}, err
	}
	_, _ = s.store.RecordAudit(actorID, "navigation_link.create", "navigation_link", link.ID, "", s.now())
	return link, nil
}

func (s *Service) ListNavigationLinks(includeDisabled bool) ([]models.NavigationLink, error) {
	return s.store.ListNavigationLinks(includeDisabled)
}

func (s *Service) SiteConfig() (models.SiteConfig, error) {
	return s.store.GetSiteConfig()
}

func (s *Service) UpdateSiteConfig(actorID string, input models.SiteConfig) (models.SiteConfig, error) {
	cfg, err := s.store.UpdateSiteConfig(input, s.now())
	if err != nil {
		return models.SiteConfig{}, err
	}
	_, _ = s.store.RecordAudit(actorID, "site_config.update", "site_config", cfg.ID, "", s.now())
	return cfg, nil
}

func (s *Service) participantByCheckin(checkinID string) (*models.Participant, error) {
	return s.store.GetParticipantByCheckinID(checkinID)
}

func hashCode(code string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(code)))
	return hex.EncodeToString(sum[:])
}

func trimProfile(input models.ParticipantProfile) models.ParticipantProfile {
	input.FullName = strings.TrimSpace(input.FullName)
	input.TeamName = strings.TrimSpace(input.TeamName)
	input.School = strings.TrimSpace(input.School)
	input.Phone = strings.TrimSpace(input.Phone)
	input.DietaryNeeds = strings.TrimSpace(input.DietaryNeeds)
	input.TShirtSize = strings.TrimSpace(input.TShirtSize)
	input.EmergencyContact = strings.TrimSpace(input.EmergencyContact)
	input.Notes = strings.TrimSpace(input.Notes)
	return input
}
