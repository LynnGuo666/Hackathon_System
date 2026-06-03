from app.repositories.food_orders import FoodOrderRepositoryMixin
from app.repositories.meal_slots import MealSlotRepositoryMixin


class MealOrderRepositoryMixin(FoodOrderRepositoryMixin, MealSlotRepositoryMixin):
    pass
