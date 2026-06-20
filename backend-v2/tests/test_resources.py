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


# ---------------------------------------------------------------------------
# 资源领取模型重构：领取方式 + 审核 + 角色 tag 白名单
# ---------------------------------------------------------------------------


def _create_pool(client, admin_headers, **overrides):
    body = {"name": "测试池", "type": "code"}
    body.update(overrides)
    return client.post(
        "/api/admin/resources/pools", headers=admin_headers, json=body
    ).json()


def _import_codes(client, admin_headers, pool_id, values):
    return client.post(
        f"/api/admin/resources/pools/{pool_id}/items/import",
        headers=admin_headers,
        json={"values": values},
    ).json()


def _approve_and_checkin(
    client, admin_headers, approve_enrollment, import_checkins, email, checkin_id
):
    """approve 终审（打 approved tag）+ bind-checkin（打 checked_in tag）。"""
    approve_enrollment(email)
    import_checkins([checkin_id])
    bound = client.post("/api/auth/bind-checkin", json={"checkinId": checkin_id})
    assert bound.status_code == 200


def _walkup(client, admin_headers, import_checkins, email, checkin_id):
    """开启 walkup 后凭 CheckinID 直接签到（仅 checked_in tag，无 approved）。"""
    client.put(
        "/api/admin/site-config", headers=admin_headers, json={"walkupCheckinEnabled": True}
    )
    import_checkins([checkin_id])
    resp = client.post(
        "/api/auth/checkin-login",
        json={"email": email, "checkinId": checkin_id, "fullName": "Walkup"},
    )
    assert resp.status_code == 200


def test_self_claim_with_checked_in_whitelist(
    client, admin_headers, login, approve_enrollment, import_checkins
):
    _approve_and_checkin(
        client, admin_headers, approve_enrollment, import_checkins, "a@example.com", "200001"
    )
    pool = _create_pool(
        client, admin_headers, claimMode="self_claim", allowedTags=["checked_in"]
    )
    _import_codes(client, admin_headers, pool["id"], ["CODE-1"])

    claimed = client.post(f"/api/resources/{pool['id']}/claim")
    assert claimed.status_code == 201
    assert claimed.json()["plainCode"] == "CODE-1"


def test_self_claim_blocked_by_whitelist(
    client, admin_headers, approve_enrollment, import_checkins
):
    # walkup 选手只有 checked_in tag，池白名单要求 approved → 403。
    _walkup(client, admin_headers, import_checkins, "walkup@example.com", "200002")
    pool = _create_pool(
        client, admin_headers, claimMode="self_claim", allowedTags=["approved"]
    )
    _import_codes(client, admin_headers, pool["id"], ["CODE-1"])

    blocked = client.post(f"/api/resources/{pool['id']}/claim")
    assert blocked.status_code == 403


def test_empty_whitelist_is_most_permissive(
    client, admin_headers, approve_enrollment, import_checkins
):
    # allowedTags=[] 最宽松：walkup 选手也能领。
    _walkup(client, admin_headers, import_checkins, "walkup2@example.com", "200003")
    pool = _create_pool(client, admin_headers, claimMode="self_claim", allowedTags=[])
    _import_codes(client, admin_headers, pool["id"], ["CODE-1"])

    claimed = client.post(f"/api/resources/{pool['id']}/claim")
    assert claimed.status_code == 201
    assert claimed.json()["plainCode"] == "CODE-1"


def test_self_apply_review_approve_flow(
    client, admin_headers, approve_enrollment, import_checkins
):
    _approve_and_checkin(
        client, admin_headers, approve_enrollment, import_checkins, "apply@example.com", "200004"
    )
    pool = _create_pool(
        client,
        admin_headers,
        claimMode="self_apply_review",
        allowedTags=["approved"],
    )
    _import_codes(client, admin_headers, pool["id"], ["CODE-1"])

    applied = client.post(f"/api/resources/{pool['id']}/apply")
    assert applied.status_code == 201
    request = applied.json()
    assert request["status"] == "pending"
    assert request["assignmentId"] == ""

    # 直领应被引导走申请路径 → 409。
    direct = client.post(f"/api/resources/{pool['id']}/claim")
    assert direct.status_code == 409

    requests = client.get("/api/admin/resources/requests", headers=admin_headers).json()
    assert len(requests) == 1
    request_id = requests[0]["id"]

    reviewed = client.post(
        f"/api/admin/resources/requests/{request_id}/review?approve=true",
        headers=admin_headers,
        json={"approve": True, "note": "ok"},
    )
    assert reviewed.status_code == 200
    body = reviewed.json()
    # approve 返回 assignment。
    assert body.get("resourceItemId") or body.get("resourceItemId") == ""

    # GET /resources 见凭证。
    resources = client.get("/api/resources").json()
    assert any(r["poolId"] == pool["id"] for r in resources)


def test_self_apply_review_reject_flow(
    client, admin_headers, approve_enrollment, import_checkins
):
    _approve_and_checkin(
        client, admin_headers, approve_enrollment, import_checkins, "rej@example.com", "200005"
    )
    pool = _create_pool(
        client, admin_headers, claimMode="self_apply_review", allowedTags=["approved"]
    )
    _import_codes(client, admin_headers, pool["id"], ["CODE-1"])

    applied = client.post(f"/api/resources/{pool['id']}/apply")
    assert applied.status_code == 201
    request_id = applied.json()["id"]

    reviewed = client.post(
        f"/api/admin/resources/requests/{request_id}/review?approve=false",
        headers=admin_headers,
        json={"approve": False, "note": "不符合条件"},
    )
    assert reviewed.status_code == 200
    request = reviewed.json()
    assert request["status"] == "rejected"
    assert request["reviewNote"] == "不符合条件"

    # 被拒后无凭证。
    resources = client.get("/api/resources").json()
    assert not any(r["poolId"] == pool["id"] for r in resources)


def test_apply_duplicate_blocked_when_no_multiple(
    client, admin_headers, approve_enrollment, import_checkins
):
    _approve_and_checkin(
        client, admin_headers, approve_enrollment, import_checkins, "dup@example.com", "200006"
    )
    pool = _create_pool(
        client, admin_headers, claimMode="self_apply_review", allowedTags=["approved"]
    )
    _import_codes(client, admin_headers, pool["id"], ["CODE-1"])

    first = client.post(f"/api/resources/{pool['id']}/apply")
    assert first.status_code == 201
    second = client.post(f"/api/resources/{pool['id']}/apply")
    assert second.status_code == 409


def test_admin_only_pool_blocks_self_claim(
    client, admin_headers, approve_enrollment, import_checkins
):
    _approve_and_checkin(
        client, admin_headers, approve_enrollment, import_checkins, "admin@example.com", "200007"
    )
    pool = _create_pool(client, admin_headers, claimMode="admin_only", allowedTags=[])
    _import_codes(client, admin_headers, pool["id"], ["CODE-1"])

    blocked = client.post(f"/api/resources/{pool['id']}/claim")
    assert blocked.status_code == 403

    # 管理员手动发放不受白名单限制。
    assigned = client.post(
        f"/api/admin/resources/pools/{pool['id']}/assign",
        headers=admin_headers,
        json={"checkinId": "200007"},
    )
    assert assigned.status_code == 201
    assert assigned.json()["plainCode"] == "CODE-1"


def test_admin_assign_bypasses_whitelist(
    client, admin_headers, approve_enrollment, import_checkins
):
    # admin_only 池白名单要求 approved；walkup 选手不命中，但管理员发放仍成功。
    _walkup(client, admin_headers, import_checkins, "walkup3@example.com", "200008")
    pool = _create_pool(
        client, admin_headers, claimMode="admin_only", allowedTags=["approved"]
    )
    _import_codes(client, admin_headers, pool["id"], ["CODE-1"])

    assigned = client.post(
        f"/api/admin/resources/pools/{pool['id']}/assign",
        headers=admin_headers,
        json={"checkinId": "200008"},
    )
    assert assigned.status_code == 201
    assert assigned.json()["plainCode"] == "CODE-1"


def test_my_eligibility_tags(
    client, admin_headers, login, approve_enrollment, import_checkins
):
    email = "elig@example.com"
    approve_enrollment(email)
    eligibility = client.get("/api/resources/my-eligibility").json()
    assert "approved" in eligibility["tags"]

    import_checkins(["200009"])
    client.post("/api/auth/bind-checkin", json={"checkinId": "200009"})
    eligibility = client.get("/api/resources/my-eligibility").json()
    assert "checked_in" in eligibility["tags"]
    assert "approved" in eligibility["tags"]


def test_apply_multiple_when_allowed(
    client, admin_headers, approve_enrollment, import_checkins
):
    _approve_and_checkin(
        client, admin_headers, approve_enrollment, import_checkins, "multi2@example.com", "200010"
    )
    pool = _create_pool(
        client,
        admin_headers,
        claimMode="self_apply_review",
        allowedTags=["approved"],
        allowMultipleClaims=True,
    )
    _import_codes(client, admin_headers, pool["id"], ["CODE-1", "CODE-2"])

    first = client.post(f"/api/resources/{pool['id']}/apply")
    second = client.post(f"/api/resources/{pool['id']}/apply")
    assert first.status_code == 201
    assert second.status_code == 201


def test_enabled_pools_always_visible(
    client, admin_headers, approve_enrollment, import_checkins
):
    # 已废弃 visible_phase 过滤：所有 enabled 池都对选手可见。
    pool = _create_pool(client, admin_headers)
    approve_enrollment("vis@example.com")
    pools = client.get("/api/resources/pools").json()
    ids = [p["id"] for p in pools]
    assert pool["id"] in ids


def test_allowed_tags_endpoint(client, admin_headers):
    options = client.get(
        "/api/admin/resources/allowed-tags", headers=admin_headers
    ).json()
    assert len(options) == 2
    by_tag = {opt["tag"]: opt for opt in options}
    assert by_tag["checked_in"]["systemEnabled"] is True

    # 关闭 checkin_enabled 后 checked_in 灰显。
    client.put(
        "/api/admin/site-config", headers=admin_headers, json={"checkinEnabled": False}
    )
    options = client.get(
        "/api/admin/resources/allowed-tags", headers=admin_headers
    ).json()
    by_tag = {opt["tag"]: opt for opt in options}
    assert by_tag["checked_in"]["systemEnabled"] is False
    assert by_tag["approved"]["systemEnabled"] is True
