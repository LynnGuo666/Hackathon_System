from collections.abc import Callable

from fastapi.testclient import TestClient


def test_meal_and_drink_orders_respect_open_windows(
    client: TestClient,
    admin_headers: dict[str, str],
    import_checkins: Callable[[list[str]], None],
    approve_enrollment: Callable[[str], None],
):
    assert client.get("/api/meal-orders").status_code == 401
    approve_enrollment("Meal@Example.com")
    assert client.get("/api/meal-orders").status_code == 401
    import_checkins(["400001"])
    assert client.post("/api/auth/bind-checkin", json={"checkinId": "400001"}).status_code == 200

    meal_slot = client.post(
        "/api/admin/meal-slots",
        headers=admin_headers,
        json={
            "title": "Day 1 午餐",
            "serviceDate": "2026-06-12",
            "serviceTime": "12:00",
            "orderDeadline": "2099-01-01T00:00",
            "isOpen": True,
            "enabled": True,
            "dietaryOptions": ["无特殊忌口", "素食", "其他"],
        },
    )
    assert meal_slot.status_code == 201
    meal_id = meal_slot.json()["id"]

    saved_meal = client.put(
        f"/api/meal-slots/{meal_id}/order",
        json={"dietaryNeeds": ["素食", "其他"], "otherDetail": "  不要葱  ", "notes": "  少油  "},
    )
    assert saved_meal.status_code == 200
    assert saved_meal.json()["dietaryNeeds"] == ["素食", "其他"]
    assert saved_meal.json()["otherDetail"] == "不要葱"

    updated_meal = client.put(
        f"/api/meal-orders/{meal_id}",
        json={"dietaryNeeds": ["无特殊忌口"], "otherDetail": "忽略", "notes": ""},
    )
    assert updated_meal.status_code == 200
    assert updated_meal.json()["otherDetail"] == ""

    meal_orders = client.get("/api/admin/meal-orders", headers=admin_headers).json()
    assert len(meal_orders) == 1
    assert meal_orders[0]["slotId"] == meal_id

    client.put(
        f"/api/admin/meal-slots/{meal_id}",
        headers=admin_headers,
        json={
            "title": "Day 1 午餐",
            "serviceDate": "2026-06-12",
            "serviceTime": "12:00",
            "orderDeadline": "2000-01-01T00:00",
            "isOpen": True,
            "enabled": True,
            "dietaryOptions": ["无特殊忌口", "素食", "其他"],
        },
    )
    closed_meal = client.put(
        f"/api/meal-slots/{meal_id}/order",
        json={"dietaryNeeds": ["素食"], "otherDetail": "", "notes": ""},
    )
    assert closed_meal.status_code == 409

    drink_slot = client.post(
        "/api/admin/drink-slots",
        headers=admin_headers,
        json={
            "title": "下午饮料补给",
            "serviceDate": "2026-06-12",
            "serviceTime": "15:00",
            "orderDeadline": "2099-01-01T00:00",
            "isOpen": True,
            "enabled": True,
            "drinkOptions": ["矿泉水", "无糖茶"],
        },
    )
    assert drink_slot.status_code == 201
    drink_id = drink_slot.json()["id"]

    invalid_drink = client.put(
        f"/api/drink-slots/{drink_id}/order",
        json={"drinkOption": "咖啡", "notes": ""},
    )
    assert invalid_drink.status_code == 400

    saved_drink = client.put(
        f"/api/drink-orders/{drink_id}",
        json={"drinkOption": "无糖茶", "notes": "  冰的  "},
    )
    assert saved_drink.status_code == 200
    assert saved_drink.json()["drinkOption"] == "无糖茶"
    assert saved_drink.json()["notes"] == "冰的"

    drink_orders = client.get("/api/admin/drink-orders", headers=admin_headers).json()
    assert len(drink_orders) == 1
    assert drink_orders[0]["slotId"] == drink_id
