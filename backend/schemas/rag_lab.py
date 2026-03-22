from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class ManualJudgeInput(BaseModel):
    trace_id: str
    groundedness: Optional[float] = Field(default=None, ge=1, le=5)
    faithfulness: Optional[float] = Field(default=None, ge=1, le=5)
    helpfulness: Optional[float] = Field(default=None, ge=1, le=5)
    citation_adequacy: Optional[float] = Field(default=None, ge=1, le=5)
    safety_tone: Optional[float] = Field(default=None, ge=1, le=5)
    trust_answer: Optional[bool] = None
    rationale: Optional[str] = None


class EvalRunInput(BaseModel):
    include_inactive: bool = False
    use_llm_judge: bool = True
    model_name: Optional[str] = None


class EvalCaseCreateInput(BaseModel):
    name: str
    query: str
    case_type: Literal["temporal", "semantic", "mixed"] = "semantic"
    expected: dict[str, Any] = Field(default_factory=dict)
    active: bool = True


class EvalCaseFromTraceInput(BaseModel):
    trace_id: str
    name: Optional[str] = None
    case_type: Literal["temporal", "semantic", "mixed"] = "mixed"
    top_k_expected: int = Field(default=3, ge=1, le=20)
    required_temporal: Optional[bool] = None
