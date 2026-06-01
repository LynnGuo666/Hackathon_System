package store

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"hackathon-system/backend/internal/models"

	_ "github.com/mattn/go-sqlite3"
)

type SQLiteStore struct {
	db *sql.DB
}

func NewSQLiteStore(path string) (*SQLiteStore, error) {
	db, err := sql.Open("sqlite3", path+"?_foreign_keys=on&_busy_timeout=5000")
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	store := &SQLiteStore{db: db}
	if err := store.Migrate(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return store, nil
}

func (s *SQLiteStore) Close() error {
	return s.db.Close()
}

func (s *SQLiteStore) Migrate() error {
	schema := `
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  checkin_id TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  email_verified_at TEXT NOT NULL,
  checked_in_at TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_verification_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_sent_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resource_pools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  distribution_rule TEXT NOT NULL,
  visible_phase TEXT NOT NULL,
  enabled INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resource_items (
  id TEXT PRIMARY KEY,
  pool_id TEXT NOT NULL REFERENCES resource_pools(id),
  code_ciphertext TEXT NOT NULL,
  public_label TEXT NOT NULL,
  status TEXT NOT NULL,
  assigned_checkin_id TEXT REFERENCES participants(checkin_id),
  assigned_at TEXT,
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS resource_assignments (
  id TEXT PRIMARY KEY,
  checkin_id TEXT NOT NULL REFERENCES participants(checkin_id),
  pool_id TEXT NOT NULL REFERENCES resource_pools(id),
  resource_item_id TEXT NOT NULL UNIQUE REFERENCES resource_items(id),
  status TEXT NOT NULL,
  delivered_by_email INTEGER NOT NULL,
  delivered_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(checkin_id, pool_id)
);

CREATE TABLE IF NOT EXISTS email_outbox (
  id TEXT PRIMARY KEY,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);
`
	_, err := s.db.Exec(schema)
	return err
}

func (s *SQLiteStore) UpsertVerificationCode(code *models.VerificationCode) error {
	_, err := s.db.Exec(`
INSERT INTO email_verification_codes (email, code_hash, expires_at, used_at, attempt_count, last_sent_at)
VALUES (?, ?, ?, NULL, ?, ?)
ON CONFLICT(email) DO UPDATE SET
  code_hash = excluded.code_hash,
  expires_at = excluded.expires_at,
  used_at = NULL,
  attempt_count = excluded.attempt_count,
  last_sent_at = excluded.last_sent_at
`, NormalizeEmail(code.Email), code.CodeHash, encodeTime(code.ExpiresAt), code.AttemptCount, encodeTime(code.LastSentAt))
	return err
}

func (s *SQLiteStore) GetVerificationCode(email string) (*models.VerificationCode, bool) {
	row := s.db.QueryRow(`
SELECT email, code_hash, expires_at, COALESCE(used_at, ''), attempt_count, last_sent_at
FROM email_verification_codes WHERE email = ?`, NormalizeEmail(email))
	var code models.VerificationCode
	var expiresAt, usedAt, lastSentAt string
	err := row.Scan(&code.Email, &code.CodeHash, &expiresAt, &usedAt, &code.AttemptCount, &lastSentAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, false
	}
	if err != nil {
		return nil, false
	}
	code.ExpiresAt = decodeTime(expiresAt)
	code.UsedAt = decodeTime(usedAt)
	code.LastSentAt = decodeTime(lastSentAt)
	return &code, true
}

func (s *SQLiteStore) MarkVerificationUsed(email string, usedAt time.Time) error {
	_, err := s.db.Exec(`UPDATE email_verification_codes SET used_at = ? WHERE email = ?`, encodeTime(usedAt), NormalizeEmail(email))
	return err
}

func (s *SQLiteStore) IncrementVerificationAttempt(email string) error {
	_, err := s.db.Exec(`UPDATE email_verification_codes SET attempt_count = attempt_count + 1 WHERE email = ?`, NormalizeEmail(email))
	return err
}

func (s *SQLiteStore) BindParticipant(email, checkinID string, now time.Time) (*models.Participant, error) {
	email = NormalizeEmail(email)
	checkinID = strings.TrimSpace(checkinID)
	if email == "" || checkinID == "" {
		return nil, errors.New("email and checkin id are required")
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var existing models.Participant
	err = scanParticipant(tx.QueryRow(`
SELECT id, COALESCE(checkin_id, ''), email, email_verified_at, checked_in_at, status, created_at, updated_at
FROM participants WHERE checkin_id = ? OR email = ? LIMIT 1`, checkinID, email), &existing)
	if err == nil {
		if existing.CheckinID == checkinID && existing.Email == email {
			return &existing, tx.Commit()
		}
		if existing.CheckinID == checkinID {
			return nil, ErrDuplicateCheckin
		}
		if existing.Email == email && existing.CheckinID != "" {
			return nil, ErrDuplicateEmail
		}
		existing.CheckinID = checkinID
		existing.CheckedInAt = now
		existing.Status = models.ParticipantActive
		existing.UpdatedAt = now
		_, err = tx.Exec(`
UPDATE participants
SET checkin_id = ?, checked_in_at = ?, status = ?, updated_at = ?
WHERE email = ?`, existing.CheckinID, encodeTime(existing.CheckedInAt), existing.Status, encodeTime(existing.UpdatedAt), existing.Email)
		if err != nil {
			return nil, mapSQLiteConstraint(err)
		}
		return &existing, tx.Commit()
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
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
	_, err = tx.Exec(`
INSERT INTO participants (id, checkin_id, email, email_verified_at, checked_in_at, status, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		p.ID, p.CheckinID, p.Email, encodeTime(p.EmailVerifiedAt), encodeTime(p.CheckedInAt), p.Status, encodeTime(p.CreatedAt), encodeTime(p.UpdatedAt))
	if err != nil {
		return nil, mapSQLiteConstraint(err)
	}
	return p, tx.Commit()
}

func (s *SQLiteStore) UpsertPreEventParticipant(email string, now time.Time) (*models.Participant, error) {
	email = NormalizeEmail(email)
	if existing, err := s.GetParticipantByEmail(email); err == nil {
		return existing, nil
	}
	p := &models.Participant{
		ID:              NewID("par"),
		Email:           email,
		EmailVerifiedAt: now,
		Status:          models.ParticipantPending,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	_, err := s.db.Exec(`
INSERT INTO participants (id, checkin_id, email, email_verified_at, checked_in_at, status, created_at, updated_at)
VALUES (?, NULL, ?, ?, '', ?, ?, ?)`,
		p.ID, p.Email, encodeTime(p.EmailVerifiedAt), p.Status, encodeTime(p.CreatedAt), encodeTime(p.UpdatedAt))
	if err != nil {
		return nil, mapSQLiteConstraint(err)
	}
	return p, nil
}

func (s *SQLiteStore) GetParticipantByEmail(email string) (*models.Participant, error) {
	var p models.Participant
	err := scanParticipant(s.db.QueryRow(`
SELECT id, COALESCE(checkin_id, ''), email, email_verified_at, checked_in_at, status, created_at, updated_at
FROM participants WHERE email = ?`, NormalizeEmail(email)), &p)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &p, err
}

func (s *SQLiteStore) GetParticipantByCheckinID(checkinID string) (*models.Participant, error) {
	var p models.Participant
	err := scanParticipant(s.db.QueryRow(`
SELECT id, COALESCE(checkin_id, ''), email, email_verified_at, checked_in_at, status, created_at, updated_at
FROM participants WHERE checkin_id = ?`, strings.TrimSpace(checkinID)), &p)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &p, err
}

func (s *SQLiteStore) CreateResourcePool(input models.ResourcePool) (models.ResourcePool, error) {
	now := time.Now()
	input.ID = NewID("pool")
	input.CreatedAt = now
	if input.DistributionRule == "" {
		input.DistributionRule = models.DistributionOnePerParticipant
	}
	if input.VisiblePhase == "" {
		input.VisiblePhase = models.VisibleAll
	}
	input.Enabled = true
	_, err := s.db.Exec(`
INSERT INTO resource_pools (id, name, type, distribution_rule, visible_phase, enabled, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?)`, input.ID, input.Name, input.Type, input.DistributionRule, input.VisiblePhase, boolInt(input.Enabled), encodeTime(now))
	return input, err
}

func (s *SQLiteStore) ListResourcePools() ([]models.ResourcePool, error) {
	rows, err := s.db.Query(`
SELECT id, name, type, distribution_rule, visible_phase, enabled, created_at
FROM resource_pools ORDER BY created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.ResourcePool
	for rows.Next() {
		var pool models.ResourcePool
		var enabled int
		var createdAt string
		if err := rows.Scan(&pool.ID, &pool.Name, &pool.Type, &pool.DistributionRule, &pool.VisiblePhase, &enabled, &createdAt); err != nil {
			return nil, err
		}
		pool.Enabled = enabled == 1
		pool.CreatedAt = decodeTime(createdAt)
		out = append(out, pool)
	}
	return out, rows.Err()
}

func (s *SQLiteStore) AddResourceItem(poolID, plainCode, label string, expiresAt time.Time) (models.ResourceItem, error) {
	item := models.ResourceItem{
		ID:             NewID("item"),
		PoolID:         poolID,
		CodeCiphertext: encryptForMVP(plainCode),
		PublicLabel:    label,
		Status:         models.ResourceAvailable,
		ExpiresAt:      expiresAt,
	}
	_, err := s.db.Exec(`
INSERT INTO resource_items (id, pool_id, code_ciphertext, public_label, status, expires_at)
VALUES (?, ?, ?, ?, ?, ?)`, item.ID, item.PoolID, item.CodeCiphertext, item.PublicLabel, item.Status, nullableTime(item.ExpiresAt))
	if err != nil {
		return models.ResourceItem{}, err
	}
	item.CodeCiphertext = ""
	return item, nil
}

func (s *SQLiteStore) ListResourceItems(poolID string) ([]models.ResourceItem, error) {
	query := `SELECT id, pool_id, public_label, status, COALESCE(assigned_checkin_id, ''), COALESCE(assigned_at, ''), COALESCE(expires_at, '') FROM resource_items`
	args := []any{}
	if poolID != "" {
		query += ` WHERE pool_id = ?`
		args = append(args, poolID)
	}
	query += ` ORDER BY id ASC`
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.ResourceItem
	for rows.Next() {
		var item models.ResourceItem
		var assignedAt, expiresAt string
		if err := rows.Scan(&item.ID, &item.PoolID, &item.PublicLabel, &item.Status, &item.AssignedCheckinID, &assignedAt, &expiresAt); err != nil {
			return nil, err
		}
		item.AssignedAt = decodeTime(assignedAt)
		item.ExpiresAt = decodeTime(expiresAt)
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *SQLiteStore) ClaimResource(poolID, checkinID string, now time.Time) (models.ResourceAssignment, string, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return models.ResourceAssignment{}, "", err
	}
	defer tx.Rollback()

	var participantExists int
	if err := tx.QueryRow(`SELECT COUNT(1) FROM participants WHERE checkin_id = ?`, checkinID).Scan(&participantExists); err != nil {
		return models.ResourceAssignment{}, "", err
	}
	if participantExists == 0 {
		return models.ResourceAssignment{}, "", ErrNotFound
	}

	var existingID string
	err = tx.QueryRow(`SELECT id FROM resource_assignments WHERE pool_id = ? AND checkin_id = ?`, poolID, checkinID).Scan(&existingID)
	if err == nil {
		return models.ResourceAssignment{}, "", ErrAlreadyAssigned
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return models.ResourceAssignment{}, "", err
	}

	var itemID, cipher string
	err = tx.QueryRow(`
SELECT id, code_ciphertext FROM resource_items
WHERE pool_id = ? AND status = ?
ORDER BY id ASC LIMIT 1`, poolID, models.ResourceAvailable).Scan(&itemID, &cipher)
	if errors.Is(err, sql.ErrNoRows) {
		return models.ResourceAssignment{}, "", ErrNoResource
	}
	if err != nil {
		return models.ResourceAssignment{}, "", err
	}

	result, err := tx.Exec(`
UPDATE resource_items
SET status = ?, assigned_checkin_id = ?, assigned_at = ?
WHERE id = ? AND status = ?`,
		models.ResourceAssigned, checkinID, encodeTime(now), itemID, models.ResourceAvailable)
	if err != nil {
		return models.ResourceAssignment{}, "", err
	}
	affected, _ := result.RowsAffected()
	if affected != 1 {
		return models.ResourceAssignment{}, "", ErrNoResource
	}

	assignment := models.ResourceAssignment{
		ID:             NewID("asg"),
		CheckinID:      checkinID,
		PoolID:         poolID,
		ResourceItemID: itemID,
		Status:         models.AssignmentAssigned,
		CreatedAt:      now,
		PlainCode:      decryptForMVP(cipher),
	}
	_, err = tx.Exec(`
INSERT INTO resource_assignments (id, checkin_id, pool_id, resource_item_id, status, delivered_by_email, created_at)
VALUES (?, ?, ?, ?, ?, 0, ?)`, assignment.ID, assignment.CheckinID, assignment.PoolID, assignment.ResourceItemID, assignment.Status, encodeTime(now))
	if err != nil {
		return models.ResourceAssignment{}, "", mapSQLiteConstraint(err)
	}
	return assignment, assignment.PlainCode, tx.Commit()
}

func (s *SQLiteStore) ListAssignments(checkinID string) ([]models.ResourceAssignment, error) {
	query := `
SELECT a.id, a.checkin_id, a.pool_id, a.resource_item_id, a.status, a.delivered_by_email,
       COALESCE(a.delivered_at, ''), a.created_at, i.code_ciphertext
FROM resource_assignments a
JOIN resource_items i ON i.id = a.resource_item_id`
	args := []any{}
	if checkinID != "" {
		query += ` WHERE a.checkin_id = ?`
		args = append(args, checkinID)
	}
	query += ` ORDER BY a.created_at ASC`
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.ResourceAssignment
	for rows.Next() {
		var a models.ResourceAssignment
		var delivered int
		var deliveredAt, createdAt, cipher string
		if err := rows.Scan(&a.ID, &a.CheckinID, &a.PoolID, &a.ResourceItemID, &a.Status, &delivered, &deliveredAt, &createdAt, &cipher); err != nil {
			return nil, err
		}
		a.DeliveredByEmail = delivered == 1
		a.DeliveredAt = decodeTime(deliveredAt)
		a.CreatedAt = decodeTime(createdAt)
		a.PlainCode = decryptForMVP(cipher)
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *SQLiteStore) MarkAssignmentDelivered(id string, now time.Time) error {
	_, err := s.db.Exec(`
UPDATE resource_assignments
SET status = ?, delivered_by_email = 1, delivered_at = ?
WHERE id = ?`, models.AssignmentDelivered, encodeTime(now), id)
	return err
}

func (s *SQLiteStore) EnqueueEmail(to, subject, body string, now time.Time) (models.EmailOutbox, error) {
	email := models.EmailOutbox{
		ID:        NewID("mail"),
		To:        NormalizeEmail(to),
		Subject:   subject,
		Body:      body,
		Status:    models.EmailPending,
		CreatedAt: now,
		UpdatedAt: now,
	}
	_, err := s.db.Exec(`
INSERT INTO email_outbox (id, recipient, subject, body, status, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?)`, email.ID, email.To, email.Subject, email.Body, email.Status, encodeTime(now), encodeTime(now))
	return email, err
}

func (s *SQLiteStore) ListEmails() ([]models.EmailOutbox, error) {
	rows, err := s.db.Query(`
SELECT id, recipient, subject, body, status, retry_count, COALESCE(last_error, ''), COALESCE(sent_at, ''), created_at, updated_at
FROM email_outbox ORDER BY created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.EmailOutbox
	for rows.Next() {
		var email models.EmailOutbox
		var sentAt, createdAt, updatedAt string
		if err := rows.Scan(&email.ID, &email.To, &email.Subject, &email.Body, &email.Status, &email.RetryCount, &email.LastError, &sentAt, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		email.SentAt = decodeTime(sentAt)
		email.CreatedAt = decodeTime(createdAt)
		email.UpdatedAt = decodeTime(updatedAt)
		out = append(out, email)
	}
	return out, rows.Err()
}

func (s *SQLiteStore) RetryEmail(id string, now time.Time) (models.EmailOutbox, error) {
	result, err := s.db.Exec(`
UPDATE email_outbox
SET status = ?, retry_count = retry_count + 1, last_error = NULL, updated_at = ?
WHERE id = ? AND status != ?`, models.EmailPending, encodeTime(now), id, models.EmailSent)
	if err != nil {
		return models.EmailOutbox{}, err
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return models.EmailOutbox{}, ErrNotFound
	}
	emails, err := s.ListEmails()
	if err != nil {
		return models.EmailOutbox{}, err
	}
	for _, email := range emails {
		if email.ID == id {
			return email, nil
		}
	}
	return models.EmailOutbox{}, ErrNotFound
}

func (s *SQLiteStore) RecordAudit(actorID, action, targetType, targetID, reason string, now time.Time) (models.AuditLog, error) {
	log := models.AuditLog{
		ID:         NewID("aud"),
		ActorID:    actorID,
		Action:     action,
		TargetType: targetType,
		TargetID:   targetID,
		Reason:     reason,
		CreatedAt:  now,
	}
	_, err := s.db.Exec(`
INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, reason, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?)`, log.ID, log.ActorID, log.Action, log.TargetType, log.TargetID, log.Reason, encodeTime(now))
	return log, err
}

func (s *SQLiteStore) ListAudits() ([]models.AuditLog, error) {
	rows, err := s.db.Query(`
SELECT id, actor_id, action, target_type, target_id, COALESCE(reason, ''), created_at
FROM audit_logs ORDER BY created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.AuditLog
	for rows.Next() {
		var log models.AuditLog
		var createdAt string
		if err := rows.Scan(&log.ID, &log.ActorID, &log.Action, &log.TargetType, &log.TargetID, &log.Reason, &createdAt); err != nil {
			return nil, err
		}
		log.CreatedAt = decodeTime(createdAt)
		out = append(out, log)
	}
	return out, rows.Err()
}

func scanParticipant(row *sql.Row, p *models.Participant) error {
	var emailVerifiedAt, checkedInAt, createdAt, updatedAt string
	if err := row.Scan(&p.ID, &p.CheckinID, &p.Email, &emailVerifiedAt, &checkedInAt, &p.Status, &createdAt, &updatedAt); err != nil {
		return err
	}
	p.EmailVerifiedAt = decodeTime(emailVerifiedAt)
	p.CheckedInAt = decodeTime(checkedInAt)
	p.CreatedAt = decodeTime(createdAt)
	p.UpdatedAt = decodeTime(updatedAt)
	return nil
}

func encodeTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(time.RFC3339Nano)
}

func decodeTime(value string) time.Time {
	if value == "" {
		return time.Time{}
	}
	t, _ := time.Parse(time.RFC3339Nano, value)
	return t
}

func nullableTime(t time.Time) any {
	if t.IsZero() {
		return nil
	}
	return encodeTime(t)
}

func boolInt(value bool) int {
	if value {
		return 1
	}
	return 0
}

func mapSQLiteConstraint(err error) error {
	message := strings.ToLower(err.Error())
	switch {
	case strings.Contains(message, "participants.email"):
		return ErrDuplicateEmail
	case strings.Contains(message, "participants.checkin_id"):
		return ErrDuplicateCheckin
	case strings.Contains(message, "resource_assignments"):
		return ErrAlreadyAssigned
	default:
		return fmt.Errorf("sqlite constraint: %w", err)
	}
}
