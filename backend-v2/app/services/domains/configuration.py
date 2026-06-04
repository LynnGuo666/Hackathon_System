import json
import urllib.error
import urllib.parse
import urllib.request

from app.core.errors import InvalidNavigation, ServiceUnavailable
from app.repositories.common import decode_time, encode_time, new_id, now_utc
from app.schemas import CountdownStage, EventLocation, FeatureLink, NavigationLink, OSMSearchResult, SiteConfig


ALLOWED_TIMEZONES = {
    "Asia/Shanghai",
    "UTC",
    "Asia/Tokyo",
    "Asia/Singapore",
    "Europe/London",
    "America/Los_Angeles",
    "America/New_York",
}


class ConfigurationServiceMixin:
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
        event_name = config.event_name.strip()
        if not event_name:
            raise InvalidNavigation("event name is required")
        if config.timezone not in ALLOWED_TIMEZONES:
            raise InvalidNavigation("unsupported timezone")

        stages: list[CountdownStage] = []
        for stage in config.countdown_stages:
            label = stage.label.strip()
            if not label:
                raise InvalidNavigation("countdown stage requires label")
            time = encode_time(decode_time(stage.time))
            if not time:
                raise InvalidNavigation("countdown stage requires time")
            stages.append(
                CountdownStage(
                    id=stage.id.strip() or new_id("stage"),
                    label=label,
                    time=time,
                )
            )
        stages.sort(key=lambda item: item.time)

        normalized = config.model_copy(
            update={
                "event_name": event_name,
                "timezone": config.timezone,
                "countdown_title": stages[0].label if stages else "",
                "countdown_end": stages[0].time if stages else "",
                "countdown_stages": stages,
            }
        )
        saved = self.repository.update_site_config(normalized.model_dump(), now)
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
