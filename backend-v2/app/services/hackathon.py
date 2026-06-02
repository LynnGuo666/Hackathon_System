import hashlib
import json
import secrets
import urllib.error
import urllib.parse
import urllib.request
from datetime import timedelta
from email.utils import parseaddr

from app.core.errors import (
    Conflict,
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
    CheckinIDRecord,
    DrinkOrder,
    DrinkSupplySlot,
    EventLocation,
    FeatureLink,
    MealOrder,
    MealOrderSlot,
    NavigationLink,
    OSMSearchResult,
    Participant,
    ParticipantStatus,
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
        if len(checkin_id) != 6 or not checkin_id.isdigit():
            raise InvalidCheckinID("invalid checkin id")
        now = now_utc()
        participant = self.repository.bind_participant_to_checkin_pool(email, checkin_id, now)
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

    def bind_checkin_with_profile(
        self, email: str, checkin_id: str, full_name: str
    ) -> Participant:
        full_name = full_name.strip()
        if not full_name:
            raise InvalidProfile("profile requires full name")
        participant = self.bind_checkin(email, checkin_id)
        now = now_utc()
        self.repository.upsert_participant_profile(
            participant.email,
            ParticipantProfile(
                fullName=full_name,
                teamName="",
                school="",
                phone="",
                dietaryNeeds="",
                tshirtSize="",
                emergencyContact="",
                notes="",
            ),
            now,
        )
        self.repository.record_audit(
            participant.email,
            "participant.checkin_profile_upsert",
            "participant_profile",
            participant.email,
            "",
            now,
        )
        return participant

    def me(self, email: str) -> Participant:
        if not email:
            raise LoginRequired("login required")
        if self.repository.participant_is_disabled(email):
            raise LoginRequired("account disabled")
        return self.repository.get_participant_by_email(email)

    def checked_in_participant(self, email: str) -> Participant:
        participant = self.me(email)
        if not participant.checkin_id:
            raise LoginRequired("checkin id required")
        return participant

    def save_profile(self, email: str, profile: ParticipantProfile) -> ParticipantProfile:
        participant = self.checked_in_participant(email)
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
        if not trimmed.full_name:
            raise InvalidProfile("profile requires full name")
        now = now_utc()
        saved = self.repository.upsert_participant_profile(participant.email, trimmed, now)
        self.repository.record_audit(
            participant.checkin_id,
            "participant.profile_upsert",
            "participant_profile",
            participant.email,
            "",
            now,
        )
        return saved

    def profile(self, email: str) -> ParticipantProfile:
        participant = self.checked_in_participant(email)
        return self.repository.get_participant_profile(participant.email)

    def generate_checkin_ids(self, actor_id: str, count: int) -> list[CheckinIDRecord]:
        if count < 1 or count > 5000:
            raise InvalidCheckinID("checkin id count must be between 1 and 5000")
        existing_count = self.repository.count_checkin_ids()
        if existing_count + count > 1_000_000:
            raise Conflict("not enough checkin ids available")
        generated: set[str] = set()
        attempts = 0
        max_attempts = count * 20 + 1000
        while len(generated) < count and attempts < max_attempts:
            attempts += 1
            generated.add(f"{secrets.randbelow(1_000_000):06d}")
        now = now_utc()
        inserted = self.repository.add_checkin_ids(sorted(generated), now, limit=count)
        while len(inserted) < count and attempts < max_attempts * 2:
            attempts += 1
            needed = count - len(inserted)
            next_ids = {f"{secrets.randbelow(1_000_000):06d}" for _ in range(needed * 2)}
            inserted.extend(
                self.repository.add_checkin_ids(sorted(next_ids), now, limit=needed)
            )
        if len(inserted) < count:
            raise Conflict("not enough checkin ids available")
        saved = inserted[:count]
        self.repository.record_audit(
            actor_id, "checkin_ids.generate", "checkin_ids", "batch", f"count={len(saved)}", now
        )
        return saved

    def import_checkin_ids(self, actor_id: str, values: list[str]) -> list[CheckinIDRecord]:
        ids = [value.strip() for value in values if value.strip()]
        if not ids:
            raise InvalidCheckinID("checkin ids are required")
        for checkin_id in ids:
            if len(checkin_id) != 6 or not checkin_id.isdigit():
                raise InvalidCheckinID("invalid checkin id")
        now = now_utc()
        inserted = self.repository.add_checkin_ids(list(dict.fromkeys(ids)), now)
        self.repository.record_audit(
            actor_id, "checkin_ids.import", "checkin_ids", "batch", f"count={len(inserted)}", now
        )
        return inserted

    def set_participant_status(
        self, actor_id: str, email: str, status: ParticipantStatus
    ) -> Participant:
        now = now_utc()
        saved = self.repository.set_participant_status(email, status, now)
        self.repository.record_audit(
            actor_id, "participant.status", "participant", saved.email, status, now
        )
        return saved

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
                "地图搜索服务暂时不可用，请稍后重试或直接填写地点名称"
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
        participant = self.checked_in_participant(email)
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
        saved = self.repository.upsert_accommodation(participant.email, saved_input, now)
        self.repository.record_audit(
            participant.checkin_id, "accommodation.upsert", "accommodation", participant.email, "", now
        )
        return saved

    def get_accommodation(self, email: str) -> AccommodationRequest:
        participant = self.checked_in_participant(email)
        return self.repository.get_accommodation(participant.email)

    def create_meal_slot(self, actor_id: str, slot: MealOrderSlot) -> MealOrderSlot:
        now = now_utc()
        saved = self.repository.create_meal_slot(self._clean_meal_slot(slot, now), now)
        self.repository.record_audit(actor_id, "meal_slot.create", "meal_slot", saved.id, "", now)
        return saved

    def update_meal_slot(self, actor_id: str, slot_id: str, slot: MealOrderSlot) -> MealOrderSlot:
        now = now_utc()
        saved = self.repository.update_meal_slot(slot_id, self._clean_meal_slot(slot, now), now)
        self.repository.record_audit(actor_id, "meal_slot.update", "meal_slot", saved.id, "", now)
        return saved

    def create_drink_slot(self, actor_id: str, slot: DrinkSupplySlot) -> DrinkSupplySlot:
        now = now_utc()
        saved = self.repository.create_drink_slot(self._clean_drink_slot(slot, now), now)
        self.repository.record_audit(actor_id, "drink_slot.create", "drink_slot", saved.id, "", now)
        return saved

    def update_drink_slot(
        self, actor_id: str, slot_id: str, slot: DrinkSupplySlot
    ) -> DrinkSupplySlot:
        now = now_utc()
        saved = self.repository.update_drink_slot(slot_id, self._clean_drink_slot(slot, now), now)
        self.repository.record_audit(actor_id, "drink_slot.update", "drink_slot", saved.id, "", now)
        return saved

    def save_meal_order(self, email: str, slot_id: str, order: MealOrder) -> MealOrder:
        participant = self.checked_in_participant(email)
        slot = self.repository.get_meal_slot(slot_id)
        self._ensure_slot_open(slot.enabled, slot.is_open, slot.close_at)
        needs = [item.strip() for item in dict.fromkeys(order.dietary_needs) if item.strip()]
        if not needs:
            raise InvalidProfile("at least one dietary option is required")
        invalid = [item for item in needs if item not in slot.dietary_options]
        if invalid:
            raise InvalidProfile(f"invalid dietary option: {invalid[0]}")
        has_other = "其他" in needs or "other" in needs
        now = now_utc()
        saved = self.repository.upsert_meal_order(
            participant.email,
            order.model_copy(
                update={
                    "slot_id": slot_id,
                    "dietary_needs": needs,
                    "other_detail": order.other_detail.strip() if has_other else "",
                    "notes": order.notes.strip(),
                }
            ),
            now,
        )
        self.repository.record_audit(
            participant.checkin_id, "meal_order.upsert", "meal_order", saved.id, "", now
        )
        return saved

    def save_drink_order(self, email: str, slot_id: str, order: DrinkOrder) -> DrinkOrder:
        participant = self.checked_in_participant(email)
        slot = self.repository.get_drink_slot(slot_id)
        self._ensure_slot_open(slot.enabled, slot.is_open, slot.close_at)
        drink_option = order.drink_option.strip()
        if not drink_option:
            raise InvalidProfile("drink option is required")
        if drink_option not in slot.drink_options:
            raise InvalidProfile("drink option is not available")
        now = now_utc()
        saved = self.repository.upsert_drink_order(
            participant.email,
            order.model_copy(
                update={"slot_id": slot_id, "drink_option": drink_option, "notes": order.notes.strip()}
            ),
            now,
        )
        self.repository.record_audit(
            participant.checkin_id, "drink_order.upsert", "drink_order", saved.id, "", now
        )
        return saved

    def _clean_meal_slot(self, slot: MealOrderSlot, now) -> MealOrderSlot:
        title = slot.title.strip()
        if not title:
            raise InvalidNavigation("meal slot requires title")
        dietary_options = [item.strip() for item in slot.dietary_options if item.strip()]
        if not dietary_options:
            dietary_options = ["无特殊忌口", "素食", "清真", "不吃辣", "坚果过敏", "海鲜过敏", "其他"]
        close_at = slot.close_at or self._decode_deadline(slot.order_deadline) or now
        return slot.model_copy(
            update={
                "title": title,
                "description": slot.description.strip(),
                "service_date": slot.service_date.strip(),
                "service_time": slot.service_time.strip(),
                "order_deadline": slot.order_deadline.strip(),
                "dietary_options": dietary_options,
                "open_at": slot.open_at or now,
                "close_at": close_at,
            }
        )

    def _clean_drink_slot(self, slot: DrinkSupplySlot, now) -> DrinkSupplySlot:
        title = slot.title.strip()
        if not title:
            raise InvalidNavigation("drink slot requires title")
        drink_options = [item.strip() for item in slot.drink_options if item.strip()]
        if not drink_options:
            drink_options = ["矿泉水", "可乐", "无糖饮料", "茶", "咖啡", "不需要"]
        close_at = slot.close_at or self._decode_deadline(slot.order_deadline) or now
        return slot.model_copy(
            update={
                "title": title,
                "description": slot.description.strip(),
                "service_date": slot.service_date.strip(),
                "service_time": slot.service_time.strip(),
                "order_deadline": slot.order_deadline.strip(),
                "drink_options": drink_options,
                "open_at": slot.open_at or now,
                "close_at": close_at,
            }
        )

    def _decode_deadline(self, value: str):
        from app.repositories.sqlite import decode_time

        try:
            return decode_time(value)
        except ValueError:
            return None

    def _ensure_slot_open(self, enabled: bool, is_open: bool, close_at) -> None:
        if not enabled or not is_open:
            raise Conflict("slot is not open")
        if close_at and now_utc() > close_at:
            raise Conflict("slot is closed")
