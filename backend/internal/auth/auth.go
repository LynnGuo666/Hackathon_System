package auth

import "net/http"

type Role string

const (
	RoleParticipant   Role = "participant"
	RoleSuperAdmin    Role = "super_admin"
	RoleResourceAdmin Role = "resource_admin"
	RoleVolunteer     Role = "volunteer"
)

func ActorID(r *http.Request) string {
	if value := r.Header.Get("X-Actor-ID"); value != "" {
		return value
	}
	if email, err := r.Cookie("participant_email"); err == nil {
		return email.Value
	}
	return "anonymous"
}

func RoleFromRequest(r *http.Request) Role {
	switch r.Header.Get("X-Admin-Role") {
	case string(RoleSuperAdmin):
		return RoleSuperAdmin
	case string(RoleResourceAdmin):
		return RoleResourceAdmin
	case string(RoleVolunteer):
		return RoleVolunteer
	default:
		return RoleParticipant
	}
}

func CanManageResources(role Role) bool {
	return role == RoleSuperAdmin || role == RoleResourceAdmin
}

func CanRetryEmail(role Role) bool {
	return role == RoleSuperAdmin || role == RoleResourceAdmin
}
