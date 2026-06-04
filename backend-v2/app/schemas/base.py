from pydantic import BaseModel, ConfigDict


class APIModel(BaseModel):
    # 前端统一使用 camelCase，后端代码保持 snake_case；该配置让两种命名都能反序列化。
    model_config = ConfigDict(populate_by_name=True)
