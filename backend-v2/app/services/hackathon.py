import hashlib
import json
import secrets
import urllib.error
import urllib.parse
import urllib.request
from datetime import timedelta
from email.utils import parseaddr

from app.core.errors import (
    InvalidCheckinID,
    InvalidCode,
    InvalidEmail,
    InvalidNavigation,
    InvalidProfile,
    InvalidResourceCSV,
    LoginRequired,
    ServiceUnavailable,
    TooManyAttempts,
)
from app.core.security import normalize_email
from app.repositories.sqlite import SQLiteRepository, now_utc
from app.schemas import (
    AccommodationOption,
    AccommodationRequest,
    EventLocation,
    FeatureLink,
    NavigationLink,
    OSMSearchResult,
    Participant,
    ParticipantProfile,
    ResourceAssignment,
    ResourceItem,
    ResourcePool,
    SiteConfig,
    VerificationCode,
)
from app.services import mailer


def hash_code(code: str) -> str:
    return hashlib.sha256(code.strip().encode()).hexdigest()


class HackathonService:
    def __init__(self, repository: SQLiteRepository):
        self.repository = repository

    def send_code(self, email: str) -> None:
        email = normalize_email(email)
        parsed_name, parsed_email = parseaddr(email)
        if parsed_name or parsed_email != email or "@" not in email:
            raise InvalidEmail("invalid email")
        now = now_utc()
        code = f"{secrets.randbelow(1_000_000):06d}"
        print(f"[auth] verification code for {email}: {code}", flush=True)
        self.repository.upsert_verification_code(
            VerificationCode(
                email=email,
                code_hash=hash_code(code),
                expiresAt=now + timedelta(minutes=10),
                lastSentAt=now,
            )
        )
        self.repository.enqueue_email(
            email, mailer.verification_subject(), mailer.verification_body(code), now
        )

    def verify_code(self, email: str, code: str) -> None:
        email = normalize_email(email)
        verification = self.repository.get_verification_code(email)
        if not verification:
            raise InvalidCode("invalid or expired code")
        if verification.attempt_count >= 5:
            raise TooManyAttempts("too many verification attempts")
        now = now_utc()
        if (
            verification.used_at
            or now > verification.expires_at
            or verification.code_hash != hash_code(code)
        ):
            self.repository.increment_verification_attempt(email)
            raise InvalidCode("invalid or expired code")
        self.repository.mark_verification_used(email, now)
        self.repository.upsert_pre_event_participant(email, now)

    def bind_checkin(self, email: str, checkin_id: str) -> Participant:
        if not email:
            raise LoginRequired("login required")
        checkin_id = checkin_id.strip()
        if len(checkin_id) < 4 or len(checkin_id) > 64:
            raise InvalidCheckinID("invalid checkin id")
        now = now_utc()
        participant = self.repository.bind_participant(email, checkin_id, now)
        self.repository.enqueue_email(
            participant.email,
            mailer.checkin_bound_subject(),
            mailer.checkin_bound_body(participant.checkin_id),
            now,
        )
        self.repository.record_audit(
            participant.checkin_id,
            "participant.bind_checkin",
            "participant",
            participant.checkin_id,
            "",
            now,
        )
        return participant

    def me(self, email: str) -> Participant:
        if not email:
            raise LoginRequired("login required")
        return self.repository.get_participant_by_email(email)

    def save_profile(self, email: str, profile: ParticipantProfile) -> ParticipantProfile:
        if not email:
            raise LoginRequired("login required")
        trimmed = profile.model_copy(
            update={
                "full_name": profile.full_name.strip(),
                "team_name": profile.team_name.strip(),
                "school": profile.school.strip(),
                "phone": profile.phone.strip(),
                "dietary_needs": profile.dietary_needs.strip(),
                "tshirt_size": profile.tshirt_size.strip(),
                "emergency_contact": profile.emergency_contact.strip(),
                "notes": profile.notes.strip(),
            }
        )
        if not trimmed.full_name or not trimmed.team_name or not trimmed.school or not trimmed.phone:
            raise InvalidProfile("profile requires full name, team name, school, and phone")
        self.repository.get_participant_by_email(email)
        now = now_utc()
        saved = self.repository.upsert_participant_profile(email, trimmed, now)
        self.repository.record_audit(
            email, "participant.profile_upsert", "participant_profile", email, "", now
        )
        return saved

    def profile(self, email: str) -> ParticipantProfile:
        if not email:
            raise LoginRequired("login required")
        return self.repository.get_participant_profile(email)

    def create_pool(self, actor_id: str, pool: ResourcePool) -> ResourcePool:
        saved = self.repository.create_resource_pool(pool)
        self.repository.record_audit(
            actor_id, "resource_pool.create", "resource_pool", saved.id, "", now_utc()
        )
        return saved

    def import_resource_codes(
        self, actor_id: str, pool_id: str, codes: list[str]
    ) -> list[ResourceItem]:
        if not codes:
            raise InvalidResourceCSV("resource csv must contain at least one code")
        items: list[ResourceItem] = []
        for index, code in enumerate(codes, start=1):
            code = code.strip()
            if not code:
                continue
            items.append(self.repository.add_resource_item(pool_id, code, f"兑换码 {index:03d}"))
        self.repository.record_audit(
            actor_id,
            "resource_item.import",
            "resource_pool",
            pool_id,
            f"imported={len(items)}",
            now_utc(),
        )
        return items

    def claim_resource(self, actor_id: str, pool_id: str, checkin_id: str) -> ResourceAssignment:
        if not checkin_id.strip():
            raise InvalidCheckinID("invalid checkin id")
        now = now_utc()
        assignment, plain_code = self.repository.claim_resource(pool_id, checkin_id, now)
        pool_name = "资源"
        for pool in self.repository.list_resource_pools():
            if pool.id == pool_id:
                pool_name = pool.name
                break
        try:
            participant = self.repository.get_participant_by_checkin_id(checkin_id)
            self.repository.enqueue_email(
                participant.email,
                mailer.resource_assigned_subject(pool_name),
                mailer.resource_assigned_body(pool_name, plain_code),
                now,
            )
        except Exception:
            pass
        self.repository.record_audit(
            actor_id, "resource.assign", "resource_assignment", assignment.id, "", now
        )
        return assignment

    def my_resources(self, checkin_id: str) -> list[ResourceAssignment]:
        return self.repository.list_assignments(checkin_id)

    def create_navigation_link(self, actor_id: str, link: NavigationLink) -> NavigationLink:
        trimmed = link.model_copy(
            update={
                "title": link.title.strip(),
                "description": link.description.strip(),
                "url": link.url.strip(),
            }
        )
        if not trimmed.title or not trimmed.url:
            raise InvalidNavigation("navigation link requires title and url")
        now = now_utc()
        saved = self.repository.create_navigation_link(trimmed, now)
        self.repository.record_audit(
            actor_id, "navigation_link.create", "navigation_link", saved.id, "", now
        )
        return saved

    def create_feature_link(self, actor_id: str, link: FeatureLink) -> FeatureLink:
        trimmed = link.model_copy(
            update={
                "title": link.title.strip(),
                "description": link.description.strip(),
                "url": link.url.strip(),
            }
        )
        if not trimmed.title or not trimmed.url:
            raise InvalidNavigation("feature link requires title and url")
        now = now_utc()
        saved = self.repository.create_feature_link(trimmed, now)
        self.repository.record_audit(
            actor_id, "feature_link.create", "feature_link", saved.id, "", now
        )
        return saved

    def set_feature_enabled(
        self, actor_id: str, feature_id: str, enabled: bool
    ) -> FeatureLink:
        now = now_utc()
        saved = self.repository.set_feature_link_enabled(feature_id, enabled, now)
        self.repository.record_audit(
            actor_id,
            "feature_link.enable" if enabled else "feature_link.disable",
            "feature_link",
            saved.id,
            "",
            now,
        )
        return saved

    def update_site_config(self, actor_id: str, config: SiteConfig) -> SiteConfig:
        now = now_utc()
        saved = self.repository.update_site_config(config.model_dump(), now)
        self.repository.record_audit(
            actor_id, "site_config.update", "site_config", saved["id"], "", now
        )
        return SiteConfig(**saved)

    def search_locations(self, query: str) -> list[OSMSearchResult]:
        query = query.strip()
        if not query:
            return []
        params = urllib.parse.urlencode(
            {
                "q": query,
                "format": "jsonv2",
                "limit": "5",
                "addressdetails": "1",
            }
        )
        request = urllib.request.Request(
            f"https://nominatim.openstreetmap.org/search?{params}",
            headers={
                "User-Agent": "Hackathon_System/0.1 contact:admin@example.com",
                "Accept": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=8) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (TimeoutError, urllib.error.URLError, json.JSONDecodeError) as exc:
            raise ServiceUnavailable(
                "地图搜索服务暂时不可用，请稍后重试或手动填写地点坐标"
            ) from exc
        results: list[OSMSearchResult] = []
        for item in payload:
            try:
                results.append(
                    OSMSearchResult(
                        placeId=str(item.get("place_id", "")),
                        displayName=item.get("display_name", ""),
                        latitude=float(item["lat"]),
                        longitude=float(item["lon"]),
                        osmType=item.get("osm_type", ""),
                        osmId=str(item.get("osm_id", "")),
                        category=item.get("category", ""),
                        type=item.get("type", ""),
                    )
                )
            except (KeyError, TypeError, ValueError):
                continue
        return results

    def update_event_location(self, actor_id: str, location: EventLocation) -> EventLocation:
        name = location.name.strip()
        if not name:
            raise InvalidNavigation("event location requires name")
        now = now_utc()
        saved = self.repository.update_event_location(
            location.model_copy(
                update={
                    "name": name,
                    "address": location.address.strip() or name,
                    "osm_type": location.osm_type.strip(),
                    "osm_id": location.osm_id.strip(),
                    "osm_url": location.osm_url.strip(),
                }
            ),
            now,
        )
        self.repository.record_audit(
            actor_id, "event_location.update", "event_location", saved.id, "", now
        )
        return saved

    def save_accommodation(
        self, email: str, request: AccommodationRequest
    ) -> AccommodationRequest:
        if not email:
            raise LoginRequired("login required")
        if not request.selections:
            raise InvalidProfile("at least one accommodation option is required")
        valid_options = set(AccommodationOption)
        for selection in request.selections:
            if selection not in valid_options:
                raise InvalidProfile(f"invalid accommodation option: {selection}")
        has_other = AccommodationOption.other in request.selections
        saved_input = request.model_copy(
            update={"other_detail": request.other_detail.strip() if has_other else ""}
        )
        now = now_utc()
        saved = self.repository.upsert_accommodation(email, saved_input, now)
        self.repository.record_audit(email, "accommodation.upsert", "accommodation", email, "", now)
        return saved

    def get_accommodation(self, email: str) -> AccommodationRequest:
        if not email:
            raise LoginRequired("login required")
        return self.repository.get_accommodation(email)
