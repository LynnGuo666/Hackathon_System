import json
import urllib.error
import urllib.parse
import urllib.request

from app.core.errors import InvalidNavigation, ServiceUnavailable
from app.repositories.common import now_utc
from app.schemas import EventLocation, FeatureLink, NavigationLink, OSMSearchResult, SiteConfig


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
