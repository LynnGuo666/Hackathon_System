package app

import (
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"douyin-hackathon-system/backend/internal/models"
	"douyin-hackathon-system/backend/internal/store"
)

func newTestService(t *testing.T) (*Service, *store.SQLiteStore) {
	t.Helper()
	db, err := store.NewSQLiteStore(t.TempDir() + "/test.sqlite")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return NewService(db), db
}

func TestPreEventEmailThenCheckinIdentity(t *testing.T) {
	service, db := newTestService(t)
	now := time.Now()

	_, err := db.UpsertPreEventParticipant("Player@Example.com", now)
	if err != nil {
		t.Fatal(err)
	}

	preEvent, err := service.Me("player@example.com")
	if err != nil {
		t.Fatal(err)
	}
	if preEvent.CheckinID != "" || preEvent.Status != models.ParticipantPending {
		t.Fatalf("expected email-only pending participant, got %+v", preEvent)
	}

	active, err := service.BindCheckin("player@example.com", "CHECKIN-001")
	if err != nil {
		t.Fatal(err)
	}
	if active.CheckinID != "CHECKIN-001" || active.Status != models.ParticipantActive {
		t.Fatalf("expected active checkin identity, got %+v", active)
	}
}

func TestCheckinIDAndEmailAreUniqueAfterBinding(t *testing.T) {
	service, db := newTestService(t)
	now := time.Now()

	_, _ = db.UpsertPreEventParticipant("a@example.com", now)
	_, _ = db.UpsertPreEventParticipant("b@example.com", now)
	if _, err := service.BindCheckin("a@example.com", "CHECKIN-001"); err != nil {
		t.Fatal(err)
	}
	if _, err := service.BindCheckin("b@example.com", "CHECKIN-001"); !errors.Is(err, store.ErrDuplicateCheckin) {
		t.Fatalf("expected duplicate checkin, got %v", err)
	}
	if _, err := service.BindCheckin("a@example.com", "CHECKIN-002"); !errors.Is(err, store.ErrDuplicateEmail) {
		t.Fatalf("expected duplicate email, got %v", err)
	}
}

func TestResourceRequiresCheckinAndIsUniquePerPool(t *testing.T) {
	service, db := newTestService(t)
	now := time.Now()

	_, _ = db.UpsertPreEventParticipant("a@example.com", now)
	pool, err := service.CreatePool("admin", models.ResourcePool{Name: "AI 兑换码", Type: models.ResourceCode})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := service.ImportResourceCodes("admin", pool.ID, []string{"CODE-1"}); err != nil {
		t.Fatal(err)
	}
	if _, err := service.ClaimResource("admin", pool.ID, ""); !errors.Is(err, ErrInvalidCheckinID) {
		t.Fatalf("expected invalid checkin before sign-in, got %v", err)
	}
	if _, err := service.BindCheckin("a@example.com", "CHECKIN-001"); err != nil {
		t.Fatal(err)
	}
	if _, err := service.ClaimResource("admin", pool.ID, "CHECKIN-001"); err != nil {
		t.Fatal(err)
	}
	if _, err := service.ClaimResource("admin", pool.ID, "CHECKIN-001"); !errors.Is(err, store.ErrAlreadyAssigned) {
		t.Fatalf("expected already assigned, got %v", err)
	}
}

func TestConcurrentResourceClaimDoesNotDuplicateCodes(t *testing.T) {
	service, db := newTestService(t)
	now := time.Now()

	pool, err := service.CreatePool("admin", models.ResourcePool{Name: "AI 兑换码", Type: models.ResourceCode})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := service.ImportResourceCodes("admin", pool.ID, []string{"CODE-1", "CODE-2", "CODE-3"}); err != nil {
		t.Fatal(err)
	}

	var wg sync.WaitGroup
	successes := make(chan string, 10)
	for i := 0; i < 10; i++ {
		checkinID := fmt.Sprintf("CHECKIN-%03d", i)
		email := fmt.Sprintf("p%03d@example.com", i)
		_, _ = db.UpsertPreEventParticipant(email, now)
		_, _ = service.BindCheckin(email, checkinID)
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			if assignment, err := service.ClaimResource("admin", pool.ID, id); err == nil {
				successes <- assignment.ResourceItemID
			}
		}(checkinID)
	}
	wg.Wait()
	close(successes)

	seen := map[string]bool{}
	for itemID := range successes {
		if seen[itemID] {
			t.Fatalf("resource item assigned twice: %s", itemID)
		}
		seen[itemID] = true
	}
	if len(seen) != 3 {
		t.Fatalf("expected exactly 3 successful claims, got %d", len(seen))
	}
}
