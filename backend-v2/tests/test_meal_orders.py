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


def test_meal_supply_template_preview_and_import(
    client: TestClient,
    admin_headers: dict[str, str],
):
    template = """
version: "1"
timezone: Asia/Shanghai
defaults:
  orderDeadline: "2099-01-01T00:00"
  enabled: true
  isOpen: true
supplies:
  - type: meal
    title: Day 1 Lunch
    serviceDate: "2026-06-12"
    serviceTime: "12:00"
    options: ["无特殊忌口", "素食", "其他"]
  - type: drink
    title: Afternoon Drinks
    serviceDate: "2026-06-12"
    serviceTime: "15:00"
    options: ["矿泉水", "无糖茶"]
"""

    preview = client.post(
        "/api/admin/meal-supply/templates/preview",
        headers=admin_headers,
        json={"content": template},
    )
    assert preview.status_code == 200
    assert preview.json()["created"] == 2
    assert client.get("/api/admin/meal-slots", headers=admin_headers).json() == []

    imported = client.post(
        "/api/admin/meal-supply/templates/import",
        headers=admin_headers,
        json={"content": template, "mode": "create_only"},
    )
    assert imported.status_code == 200
    payload = imported.json()
    assert payload["created"] == 2
    assert payload["updated"] == 0
    assert len(payload["mealSlots"]) == 1
    assert len(payload["drinkSlots"]) == 1

    skipped = client.post(
        "/api/admin/meal-supply/templates/import",
        headers=admin_headers,
        json={"content": template, "mode": "create_only"},
    )
    assert skipped.status_code == 200
    assert skipped.json()["skipped"] == 2

    updated_template = template.replace("无糖茶", "咖啡")
    updated = client.post(
        "/api/admin/meal-supply/templates/import",
        headers=admin_headers,
        json={"content": updated_template, "mode": "upsert"},
    )
    assert updated.status_code == 200
    assert updated.json()["updated"] == 2
    drink_slots = client.get("/api/admin/drink-slots", headers=admin_headers).json()
    assert drink_slots[0]["drinkOptions"] == ["矿泉水", "咖啡"]


def test_cancel_meal_and_drink_orders(
    client: TestClient,
    admin_headers: dict[str, str],
    import_checkins: Callable[[list[str]], None],
    approve_enrollment: Callable[[str], None],
):
    approve_enrollment("Cancel@Example.com")
    import_checkins(["400002"])
    assert client.post("/api/auth/bind-checkin", json={"checkinId": "400002"}).status_code == 200

    meal_slot = client.post(
        "/api/admin/meal-slots",
        headers=admin_headers,
        json={
            "title": "Cancelable Meal",
            "serviceDate": "2026-06-12",
            "serviceTime": "12:00",
            "orderDeadline": "2099-01-01T00:00",
            "isOpen": True,
            "enabled": True,
            "dietaryOptions": ["无特殊忌口", "素食"],
        },
    ).json()
    drink_slot = client.post(
        "/api/admin/drink-slots",
        headers=admin_headers,
        json={
            "title": "Cancelable Drink",
            "serviceDate": "2026-06-12",
            "serviceTime": "15:00",
            "orderDeadline": "2099-01-01T00:00",
            "isOpen": True,
            "enabled": True,
            "drinkOptions": ["矿泉水", "无糖茶"],
        },
    ).json()

    assert client.put(
        f"/api/meal-slots/{meal_slot['id']}/order",
        json={"dietaryNeeds": ["素食"], "otherDetail": "", "notes": ""},
    ).status_code == 200
    assert client.put(
        f"/api/drink-slots/{drink_slot['id']}/order",
        json={"drinkOption": "无糖茶", "notes": ""},
    ).status_code == 200

    assert client.delete(f"/api/meal-slots/{meal_slot['id']}/order").status_code == 204
    assert client.get("/api/meal-orders").json() == []
    assert client.delete(f"/api/drink-slots/{drink_slot['id']}/order").status_code == 204
    assert client.get("/api/drink-orders").json() == []

    assert client.put(
        f"/api/meal-slots/{meal_slot['id']}/order",
        json={"dietaryNeeds": ["无特殊忌口"], "otherDetail": "", "notes": ""},
    ).status_code == 200
    client.put(
        f"/api/admin/meal-slots/{meal_slot['id']}",
        headers=admin_headers,
        json={
            "title": "Cancelable Meal",
            "serviceDate": "2026-06-12",
            "serviceTime": "12:00",
            "orderDeadline": "2000-01-01T00:00",
            "isOpen": True,
            "enabled": True,
            "dietaryOptions": ["无特殊忌口", "素食"],
        },
    )
    assert client.delete(f"/api/meal-slots/{meal_slot['id']}/order").status_code == 409
