from app.repositories.sqlite import SQLiteRepository
from app.services.domains.accommodation import AccommodationServiceMixin
from app.services.domains.auth import AuthServiceMixin
from app.services.domains.configuration import ConfigurationServiceMixin
from app.services.domains.meal_orders import MealOrderServiceMixin
from app.services.domains.participants import ParticipantServiceMixin
from app.services.domains.resources import ResourceServiceMixin


class HackathonService(
    AuthServiceMixin,
    ParticipantServiceMixin,
    ResourceServiceMixin,
    ConfigurationServiceMixin,
    AccommodationServiceMixin,
    MealOrderServiceMixin,
):
    def __init__(self, repository: SQLiteRepository):
        self.repository = repository
