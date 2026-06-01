package models

import "time"

type ParticipantStatus string

const (
	ParticipantPending  ParticipantStatus = "pending"
	ParticipantActive   ParticipantStatus = "active"
	ParticipantDisabled ParticipantStatus = "disabled"
)

type Participant struct {
	ID              string            `json:"id"`
	CheckinID       string            `json:"checkinId"`
	Email           string            `json:"email"`
	EmailVerifiedAt time.Time         `json:"emailVerifiedAt"`
	CheckedInAt     time.Time         `json:"checkedInAt"`
	Status          ParticipantStatus `json:"status"`
	CreatedAt       time.Time         `json:"createdAt"`
	UpdatedAt       time.Time         `json:"updatedAt"`
}

type VerificationCode struct {
	Email        string    `json:"email"`
	CodeHash     string    `json:"-"`
	ExpiresAt    time.Time `json:"expiresAt"`
	UsedAt       time.Time `json:"usedAt,omitempty"`
	AttemptCount int       `json:"attemptCount"`
	LastSentAt   time.Time `json:"lastSentAt"`
}

type ResourcePoolType string
type DistributionRule string
type VisiblePhase string

const (
	ResourceCode       ResourcePoolType = "code"
	ResourceLink       ResourcePoolType = "link"
	ResourceCredential ResourcePoolType = "credential"
	ResourcePhysical   ResourcePoolType = "physical"

	DistributionOnePerParticipant DistributionRule = "one_per_participant"
	DistributionRoleBased         DistributionRule = "role_based"
	DistributionManual            DistributionRule = "manual"

	VisiblePreEvent VisiblePhase = "pre_event"
	VisibleInEvent  VisiblePhase = "in_event"
	VisibleAll      VisiblePhase = "all"
)

type ResourcePool struct {
	ID               string           `json:"id"`
	Name             string           `json:"name"`
	Type             ResourcePoolType `json:"type"`
	DistributionRule DistributionRule `json:"distributionRule"`
	VisiblePhase     VisiblePhase     `json:"visiblePhase"`
	Enabled          bool             `json:"enabled"`
	CreatedAt        time.Time        `json:"createdAt"`
}

type ResourceItemStatus string

const (
	ResourceAvailable ResourceItemStatus = "available"
	ResourceAssigned  ResourceItemStatus = "assigned"
	ResourceRevoked   ResourceItemStatus = "revoked"
	ResourceUsed      ResourceItemStatus = "used"
)

type ResourceItem struct {
	ID                string             `json:"id"`
	PoolID            string             `json:"poolId"`
	CodeCiphertext    string             `json:"-"`
	PublicLabel       string             `json:"publicLabel"`
	Status            ResourceItemStatus `json:"status"`
	AssignedCheckinID string             `json:"assignedCheckinId,omitempty"`
	AssignedAt        time.Time          `json:"assignedAt,omitempty"`
	ExpiresAt         time.Time          `json:"expiresAt,omitempty"`
}

type ResourceAssignmentStatus string

const (
	AssignmentAssigned  ResourceAssignmentStatus = "assigned"
	AssignmentDelivered ResourceAssignmentStatus = "delivered"
	AssignmentRevoked   ResourceAssignmentStatus = "revoked"
)

type ResourceAssignment struct {
	ID               string                   `json:"id"`
	CheckinID        string                   `json:"checkinId"`
	PoolID           string                   `json:"poolId"`
	ResourceItemID   string                   `json:"resourceItemId"`
	Status           ResourceAssignmentStatus `json:"status"`
	DeliveredByEmail bool                     `json:"deliveredByEmail"`
	DeliveredAt      time.Time                `json:"deliveredAt,omitempty"`
	CreatedAt        time.Time                `json:"createdAt"`
	PlainCode        string                   `json:"plainCode,omitempty"`
}

type EmailStatus string

const (
	EmailPending EmailStatus = "pending"
	EmailSending EmailStatus = "sending"
	EmailSent    EmailStatus = "sent"
	EmailFailed  EmailStatus = "failed"
)

type EmailOutbox struct {
	ID         string      `json:"id"`
	To         string      `json:"to"`
	Subject    string      `json:"subject"`
	Body       string      `json:"body"`
	Status     EmailStatus `json:"status"`
	RetryCount int         `json:"retryCount"`
	LastError  string      `json:"lastError,omitempty"`
	SentAt     time.Time   `json:"sentAt,omitempty"`
	CreatedAt  time.Time   `json:"createdAt"`
	UpdatedAt  time.Time   `json:"updatedAt"`
}

type AuditLog struct {
	ID         string    `json:"id"`
	ActorID    string    `json:"actorId"`
	Action     string    `json:"action"`
	TargetType string    `json:"targetType"`
	TargetID   string    `json:"targetId"`
	Reason     string    `json:"reason,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}
