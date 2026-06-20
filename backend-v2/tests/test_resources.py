from collections.abc import Callable

from fastapi.testclient import TestClient


def test_checkin_and_resource_claim(
    client: TestClient,
    admin_headers: dict[str, str],
    import_checkins: Callable[[list[str]], None],
    approve_enrollment: Callable[[str], None],
):
    approve_enrollment("a@example.com")
    import_checkins(["100001"])
    bound = client.post("/api/auth/bind-checkin", json={"checkinId": "100001"})
    assert bound.status_code == 200
    assert bound.json()["status"] == "checked_in"

    pool = client.post(
        "/api/admin/resources/pools",
        headers=admin_headers,
        json={"name": "AI 兑换码", "type": "code"},
    ).json()
    imported = client.post(
        f"/api/admin/resources/pools/{pool['id']}/items/import",
        headers=admin_headers,
        json={"codes": ["CODE-1"]},
    )
    assert imported.status_code == 201

    claimed = client.post(f"/api/resources/{pool['id']}/claim")
    assert claimed.status_code == 201
    assert claimed.json()["plainCode"] == "CODE-1"

    duplicate = client.post(f"/api/resources/{pool['id']}/claim")
    assert duplicate.status_code == 409


def test_resource_pool_can_allow_multiple_claims(
    client: TestClient,
    admin_headers: dict[str, str],
    import_checkins: Callable[[list[str]], None],
    approve_enrollment: Callable[[str], None],
):
    approve_enrollment("multi@example.com")
    import_checkins(["100002"])
    client.post("/api/auth/bind-checkin", json={"checkinId": "100002"})

    pool = client.post(
        "/api/admin/resources/pools",
        headers=admin_headers,
        json={"name": "多次发放资源", "type": "code", "allowMultipleClaims": True},
    ).json()
    imported = client.post(
        f"/api/admin/resources/pools/{pool['id']}/items/import",
        headers=admin_headers,
        json={"values": ["CODE-1", "CODE-2"]},
    )
    assert imported.status_code == 201

    first = client.post(f"/api/resources/{pool['id']}/claim")
    second = client.post(f"/api/resources/{pool['id']}/claim")

    assert first.status_code == 201
    assert second.status_code == 201
    assert {first.json()["plainCode"], second.json()["plainCode"]} == {"CODE-1", "CODE-2"}


def test_resource_pool_docs_create_and_update(
    client: TestClient,
    admin_headers: dict[str, str],
):
    pool = client.post(
        "/api/admin/resources/pools",
        headers=admin_headers,
        json={
            "name": "带说明的池",
            "type": "code",
            "docUrl": "https://example.com/doc",
            "docMarkdown": "# 标题\n- 列表项",
        },
    ).json()
    assert pool["docUrl"] == "https://example.com/doc"
    assert pool["docMarkdown"] == "# 标题\n- 列表项"

    fetched = client.get(
        f"/api/admin/resources/pools/{pool['id']}", headers=admin_headers
    ).json()
    assert fetched["docUrl"] == "https://example.com/doc"
    assert fetched["docMarkdown"] == "# 标题\n- 列表项"

    updated = client.put(
        f"/api/admin/resources/pools/{pool['id']}",
        headers=admin_headers,
        json={"docUrl": "https://example.com/doc2", "name": "改名后的池"},
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["name"] == "改名后的池"
    assert body["docUrl"] == "https://example.com/doc2"
    # 未传 docMarkdown 时保持原值（None 表示不改）。
    assert body["docMarkdown"] == "# 标题\n- 列表项"


def test_resource_item_docs_update(
    client: TestClient,
    admin_headers: dict[str, str],
):
    pool = client.post(
        "/api/admin/resources/pools",
        headers=admin_headers,
        json={"name": "Key 说明池", "type": "code"},
    ).json()
    imported = client.post(
        f"/api/admin/resources/pools/{pool['id']}/items/import",
        headers=admin_headers,
        json={"values": ["CODE-1", "CODE-2"]},
    )
    assert imported.status_code == 201
    items = imported.json()
    item_id = items[0]["id"]
    assert items[0]["docUrl"] == ""
    assert items[0]["docMarkdown"] == ""

    updated = client.put(
        f"/api/admin/resources/pools/{pool['id']}/items/{item_id}",
        headers=admin_headers,
        json={"docUrl": "https://example.com/key", "docMarkdown": "## 使用说明"},
    )
    assert updated.status_code == 200
    assert updated.json()["docUrl"] == "https://example.com/key"
    assert updated.json()["docMarkdown"] == "## 使用说明"

    listed = client.get(
        f"/api/admin/resources/pools/{pool['id']}/items", headers=admin_headers
    ).json()
    target = next(item for item in listed if item["id"] == item_id)
    assert target["docUrl"] == "https://example.com/key"
    assert target["docMarkdown"] == "## 使用说明"


def test_participant_visible_pools(
    client: TestClient,
    admin_headers: dict[str, str],
    import_checkins: Callable[[list[str]], None],
    approve_enrollment: Callable[[str], None],
):
    enabled = client.post(
        "/api/admin/resources/pools",
        headers=admin_headers,
        json={
            "name": "可见池",
            "type": "code",
            "docUrl": "https://example.com/visible",
            "docMarkdown": "# 可见说明",
        },
    ).json()
    disabled = client.post(
        "/api/admin/resources/pools",
        headers=admin_headers,
        json={"name": "停用池", "type": "code"},
    ).json()
    client.put(
        f"/api/admin/resources/pools/{disabled['id']}",
        headers=admin_headers,
        json={"enabled": False},
    )

    approve_enrollment("visible@example.com")
    import_checkins(["100010"])
    client.post("/api/auth/bind-checkin", json={"checkinId": "100010"})

    pools = client.get("/api/resources/pools").json()
    ids = [pool["id"] for pool in pools]
    assert enabled["id"] in ids
    assert disabled["id"] not in ids
    visible = next(pool for pool in pools if pool["id"] == enabled["id"])
    assert visible["docUrl"] == "https://example.com/visible"
    assert visible["docMarkdown"] == "# 可见说明"


def test_assignment_carries_pool_and_item_docs(
    client: TestClient,
    admin_headers: dict[str, str],
    import_checkins: Callable[[list[str]], None],
    approve_enrollment: Callable[[str], None],
):
    approve_enrollment("doc@example.com")
    import_checkins(["100020"])
    client.post("/api/auth/bind-checkin", json={"checkinId": "100020"})

    pool = client.post(
        "/api/admin/resources/pools",
        headers=admin_headers,
        json={
            "name": "凭证池",
            "type": "credential",
            "docMarkdown": "# 池级说明",
        },
    ).json()
    imported = client.post(
        f"/api/admin/resources/pools/{pool['id']}/items/import",
        headers=admin_headers,
        json={"values": ["CODE-1"]},
    ).json()
    item_id = imported[0]["id"]
    client.put(
        f"/api/admin/resources/pools/{pool['id']}/items/{item_id}",
        headers=admin_headers,
        json={"docUrl": "https://example.com/item", "docMarkdown": "## Key 说明"},
    )

    client.post(f"/api/resources/{pool['id']}/claim")

    resources = client.get("/api/resources").json()
    assert len(resources) == 1
    assignment = resources[0]
    assert assignment["poolName"] == "凭证池"
    assert assignment["poolType"] == "credential"
    assert assignment["itemDocUrl"] == "https://example.com/item"
    assert assignment["itemDocMarkdown"] == "## Key 说明"
