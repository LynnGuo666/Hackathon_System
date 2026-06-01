package store

import (
	"time"

	"douyin-hackathon-system/backend/internal/models"
)

type Store interface {
	UpsertVerificationCode(code *models.VerificationCode) error
	GetVerificationCode(email string) (*models.VerificationCode, bool)
	MarkVerificationUsed(email string, usedAt time.Time) error
	IncrementVerificationAttempt(email string) error

	BindParticipant(email, checkinID string, now time.Time) (*models.Participant, error)
	UpsertPreEventParticipant(email string, now time.Time) (*models.Participant, error)
	GetParticipantByEmail(email string) (*models.Participant, error)
	GetParticipantByCheckinID(checkinID string) (*models.Participant, error)

	CreateResourcePool(input models.ResourcePool) (models.ResourcePool, error)
	ListResourcePools() ([]models.ResourcePool, error)
	AddResourceItem(poolID, plainCode, label string, expiresAt time.Time) (models.ResourceItem, error)
	ListResourceItems(poolID string) ([]models.ResourceItem, error)
	ClaimResource(poolID, checkinID string, now time.Time) (models.ResourceAssignment, string, error)
	ListAssignments(checkinID string) ([]models.ResourceAssignment, error)
	MarkAssignmentDelivered(id string, now time.Time) error

	EnqueueEmail(to, subject, body string, now time.Time) (models.EmailOutbox, error)
	ListEmails() ([]models.EmailOutbox, error)
	RetryEmail(id string, now time.Time) (models.EmailOutbox, error)

	RecordAudit(actorID, action, targetType, targetID, reason string, now time.Time) (models.AuditLog, error)
	ListAudits() ([]models.AuditLog, error)
}
