from dataclasses import dataclass, field


@dataclass
class Param:
    name: str
    type: str = "string"
    required: bool = False
    description: str = ""
    options: list[str] = field(default_factory=list)
    accepts: str = ""

    def to_dict(self) -> dict:
        d = {
            "name": self.name,
            "type": self.type,
            "required": self.required,
            "description": self.description,
        }
        if self.options:
            d["options"] = self.options
        if self.accepts:
            d["accepts"] = self.accepts
        return d
