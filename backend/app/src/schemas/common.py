from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class BaseSchema(BaseModel):    
    """ Base class for all schemas (allows to return JSON in `camelCase`). Inherits from BaseModel.
    """
    
    model_config = ConfigDict(
        alias_generator=to_camel,   # serializes model fields when `model_dump()` into `camelCase``
        validate_by_alias=True,     # allows to populate model by the alias
        validate_by_name=True,      # allows to populate model by the attribute name
    )
    

class QuerySchema(BaseSchema):
    """ Base class for all query scheams (i.e., Query Parameter Models). Inherits from BaseSchema.
    """
    
    model_config = ConfigDict(
        validate_by_name=False,
        extra="forbid"
    )