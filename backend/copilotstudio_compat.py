"""
Compat shim for a bug in microsoft-agents-copilotstudio-client==1.5.0 (latest as of
writing; confirmed still present at that version, see github.com/microsoft/Agents).

Copilot Studio now returns citation entities with a JSON-LD "@id" field. The SDK's
_SchemaMixin._validate_model tries to `setattr(model, "at_id", data["@id"])` on
every model that mixes it in, but ClientCitation / ClientCitationAppearance /
SensitivityUsageInfo never declare an `at_id` field (only `at_type` is declared) -
so any response with a citation raises a hard pydantic ValidationError and the
whole turn fails, instead of just the "@id" being dropped.

This patches the one broken function to guard the setattr calls, so an unmodeled
"@id" is ignored rather than fatal (at_type/at_context are unaffected). Remove
this once the SDK models `id`/`at_id` on those classes upstream - check by
running verify() after any SDK version bump.
"""

from typing import Any

from microsoft_agents.activity.entity import _schema_mixin


def _patched_validate_schema_model(data: Any, handler):
    model = handler(data)
    if isinstance(data, dict):
        for json_key, attr_name in (
            ("@type", "at_type"),
            ("@context", "at_context"),
            ("@id", "at_id"),
        ):
            if json_key in data and hasattr(model, attr_name):
                setattr(model, attr_name, data[json_key])
    return model


def apply():
    _schema_mixin.validate_schema_model = _patched_validate_schema_model


def verify() -> bool:
    """Returns True if the upstream bug is still present (patch still needed)."""
    from microsoft_agents.activity.entity.ai_entity import ClientCitation

    try:
        ClientCitation.model_validate({"@type": "Claim", "position": 1, "@id": "x"})
        return False
    except Exception:
        return True
