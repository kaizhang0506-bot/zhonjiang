"""数字回合统计小游戏 - FastAPI 后端服务

接口清单：
- POST /api/add_record      新增回合记录（后端校验 0-9，自动计算总和）
- GET  /api/get_records     分页获取回合记录列表
- GET  /api/get_stat_predict 全量历史数据分位置独立统计，生成娱乐参考数字

声明：本服务仅用于休闲数字统计娱乐，统计结果不具备任何预测能力，严禁用于博彩。
"""
import math
import os
import random as random_module
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backend.database import db_add_record, db_delete_record, db_get_all, db_get_page, db_update_record, init_db

app = FastAPI(title="数字回合统计小游戏 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# 生产环境前端构建产物目录（由 FastAPI 托管，单进程同时提供页面与 API）
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")

# 分位置字段定义：三个位置独立统计，互不干扰
POSITION_FIELDS: List[Dict[str, Any]] = [
    {"position": 1, "field": "num1", "label": "第一位置"},
    {"position": 2, "field": "num2", "label": "第二位置"},
    {"position": 3, "field": "num3", "label": "第三位置"},
]

DISCLAIMER = (
    "娱乐参考仅为历史数据统计，不存在预测能力，仅游戏娱乐，不可用于购彩、赌博。"
    "本系统对三个位置数字分开独立统计，位置之间互不干扰。"
)


class AddRecordRequest(BaseModel):
    """新增回合记录请求体"""

    round_no: str = Field(..., min_length=1, max_length=50, description="回合编号")
    num1: int = Field(..., description="第一位置数字(0-9)")
    num2: int = Field(..., description="第二位置数字(0-9)")
    num3: int = Field(..., description="第三位置数字(0-9)")


class UpdateRecordRequest(BaseModel):
    """编辑回合记录请求体（数字变更后重算总和）"""

    id: int = Field(..., ge=1, description="记录ID")
    round_no: str = Field(..., min_length=1, max_length=50, description="回合编号")
    num1: int = Field(..., description="第一位置数字(0-9)")
    num2: int = Field(..., description="第二位置数字(0-9)")
    num3: int = Field(..., description="第三位置数字(0-9)")


class DeleteRecordRequest(BaseModel):
    """删除回合记录请求体"""

    id: int = Field(..., ge=1, description="记录ID")


def validate_digit(value: int, label: str) -> None:
    """后端强校验：数字必须是 0-9 范围内的整数"""
    if not isinstance(value, int) or isinstance(value, bool) or value < 0 or value > 9:
        raise HTTPException(status_code=400, detail=f"{label}必须是 0-9 范围内的整数，当前值不合法")


@app.post("/api/add_record")
def add_record(req: AddRecordRequest) -> Dict[str, Any]:
    """新增回合记录：校验数字范围 -> 计算总和 -> 落库"""
    validate_digit(req.num1, "第一位置数字")
    validate_digit(req.num2, "第二位置数字")
    validate_digit(req.num3, "第三位置数字")

    round_no = req.round_no.strip()
    if not round_no:
        raise HTTPException(status_code=400, detail="回合编号不能为空")

    sum_val = req.num1 + req.num2 + req.num3
    record = db_add_record(round_no, req.num1, req.num2, req.num3, sum_val)
    return {"success": True, "message": "回合记录保存成功", "data": record}


@app.get("/api/get_records")
def get_records(
    page: int = Query(1, ge=1, description="页码，从 1 开始"),
    page_size: int = Query(10, ge=1, le=100, description="每页条数，1-100"),
) -> Dict[str, Any]:
    """分页获取回合记录列表"""
    data = db_get_page(page=page, page_size=page_size)
    return {"success": True, "data": data}


@app.get("/api/get_stat_predict")
def get_stat_predict() -> Dict[str, Any]:
    """分位置独立统计：读取全部历史数据，统计每个位置 0-9 的出现频次，
    生成三口径娱乐参考（热号=历史高频、冷号=历史低频、长缺号=当前连续未出最长），
    三个位置互不干扰、不混合计算。全部仅为历史统计描述，不具备任何预测能力。
    """
    records = db_get_all()
    total_records = len(records)
    positions: List[Dict[str, Any]] = []
    combined: List[Optional[int]] = []
    combined_cold: List[Optional[int]] = []
    combined_miss: List[Optional[int]] = []

    # 完整三位组合按历史出现次数汇总；元组天然保留三个位置的顺序。
    combination_counts: Dict[tuple[int, int, int], int] = {}
    for rec in records:
        combination = (rec["num1"], rec["num2"], rec["num3"])
        combination_counts[combination] = combination_counts.get(combination, 0) + 1

    # 频次降序；同频时按三位组合的数字顺序升序，保证结果稳定。
    top_combinations = [
        {
            "digits": list(combination),
            "count": count,
            "rate": round(count / total_records, 4),
        }
        for combination, count in sorted(
            combination_counts.items(), key=lambda item: (-item[1], item[0])
        )[:3]
    ]

    for meta in POSITION_FIELDS:
        counts = [0] * 10
        last_index = [-1] * 10  # 每个数字最后一次出现的记录索引（按录入顺序）
        for idx, rec in enumerate(records):
            value = rec[meta["field"]]
            if isinstance(value, int) and 0 <= value <= 9:
                counts[value] += 1
                last_index[value] = idx

        total = sum(counts)
        if total > 0:
            max_count = max(counts)
            # 频次最高的数字作为该位置娱乐参考；并列时取数字较小者
            recommend: Optional[int] = min(d for d, c in enumerate(counts) if c == max_count)
            min_count = min(counts)
            # 冷号：频次最低；并列时取数字较小者
            cold: Optional[int] = min(d for d, c in enumerate(counts) if c == min_count)
        else:
            max_count = 0
            recommend = None
            cold = None

        # 长缺号：截至最新一期，各数字已连续未出现的期数（从未出现按总期数计）
        miss = [total_records - 1 - last_idx for last_idx in last_index]
        max_miss = max(miss)
        miss_digit: Optional[int] = min(d for d, m in enumerate(miss) if m == max_miss) if total_records > 0 else None

        combined.append(recommend)
        combined_cold.append(cold)
        combined_miss.append(miss_digit)
        positions.append(
            {
                "position": meta["position"],
                "field": meta["field"],
                "label": meta["label"],
                "counts": counts,
                "recommend": recommend,
                "recommend_count": max_count,
                "cold": cold,
                "cold_count": min(counts) if total > 0 else 0,
                "miss_digit": miss_digit,
                "miss_count": max_miss,
                "total": total,
            }
        )

    return {
        "success": True,
        "message": DISCLAIMER,
        "data": {
            "total_records": total_records,
            "positions": positions,
            "combined": combined,
            "combined_cold": combined_cold,
            "combined_miss": combined_miss,
            "top_combinations": top_combinations,
        },
    }


# 回测前作为初始训练样本的最少期数（避免小样本阶段的策略失真）
BACKTEST_MIN_TRAIN = 20

BACKTEST_STRATEGY_META: List[Dict[str, str]] = [
    {"key": "hot", "label": "热号策略（追历史高频）"},
    {"key": "cold", "label": "冷号策略（押历史低频）"},
    {"key": "miss", "label": "长缺策略（赌遗漏回补）"},
    {"key": "random", "label": "随机策略（纯瞎猜对照组）"},
]


def _strategy_pick(strategy: str, counts: List[int], last_list: List[int], current_index: int, rng: "random_module.Random") -> int:
    """按策略生成对一个位置的预测数字（仅供回测演示，不构成任何真实预测）"""
    if strategy == "random":
        return rng.randint(0, 9)
    if strategy == "hot":
        return min(d for d, c in enumerate(counts) if c == max(counts))
    if strategy == "cold":
        return min(d for d, c in enumerate(counts) if c == min(counts))
    # miss：当前遗漏最长（距最近一次出现的期数；从未出现按全部期数计）
    miss = [current_index - 1 - last_idx for last_idx in last_list]
    return min(d for d, m in enumerate(miss) if m == max(miss))


@app.get("/api/backtest_strategies")
def backtest_strategies() -> Dict[str, Any]:
    """预测有效性回测（教育演示）：
    让热号/冷号/长缺/随机四种策略在历史数据上逐期“预测”下一期，
    统计真实命中率并与理论值（单位置恒为 10%）对比。
    结论：所有策略命中率都在理论值附近的随机波动带内——任何选号策略都无法战胜纯随机。
    本接口仅用于展示“预测不存在”，严禁作为任何投注参考。
    """
    records = db_get_all()  # id 升序，即录入/期号顺序
    n = len(records)
    trials = max(n - BACKTEST_MIN_TRAIN, 0)
    rng = random_module.Random(42)  # 固定种子，随机对照组结果可复现

    strategy_results: List[Dict[str, Any]] = []
    for meta in BACKTEST_STRATEGY_META:
        strategy = meta["key"]
        pos_hits = [0, 0, 0]
        all3_hits = 0
        counts_list = [[0] * 10 for _ in range(3)]
        last_list = [[-1] * 10 for _ in range(3)]

        # 初始训练窗口：前 BACKTEST_MIN_TRAIN 期
        for j in range(min(BACKTEST_MIN_TRAIN, n)):
            for pi, field_meta in enumerate(POSITION_FIELDS):
                v = records[j][field_meta["field"]]
                counts_list[pi][v] += 1
                last_list[pi][v] = j

        for i in range(BACKTEST_MIN_TRAIN, n):
            preds: List[int] = []
            for pi, field_meta in enumerate(POSITION_FIELDS):
                pred = _strategy_pick(strategy, counts_list[pi], last_list[pi], i, rng)
                preds.append(pred)
                if pred == records[i][field_meta["field"]]:
                    pos_hits[pi] += 1
            if all(preds[k] == records[i][POSITION_FIELDS[k]["field"]] for k in range(3)):
                all3_hits += 1
            # 纳入第 i 期，供下一期预测
            for pi, field_meta in enumerate(POSITION_FIELDS):
                v = records[i][field_meta["field"]]
                counts_list[pi][v] += 1
                last_list[pi][v] = i

        strategy_results.append(
            {
                "key": strategy,
                "label": meta["label"],
                "positions": [
                    {
                        "label": field_meta["label"],
                        "hits": pos_hits[pi],
                        "rate": round(pos_hits[pi] / trials, 4) if trials > 0 else 0.0,
                    }
                    for pi, field_meta in enumerate(POSITION_FIELDS)
                ],
                "all3_hits": all3_hits,
                "all3_rate": round(all3_hits / trials, 5) if trials > 0 else 0.0,
            }
        )

    single_std = math.sqrt(0.1 * 0.9 / trials) if trials > 0 else 0.0
    return {
        "success": True,
        "message": DISCLAIMER,
        "data": {
            "total_records": n,
            "trials": trials,
            "theory": {
                "single_rate": 0.1,
                "all3_rate": 0.001,
                "single_std": round(single_std, 4),
            },
            "strategies": strategy_results,
        },
    }


@app.get("/api/health")
def health() -> Dict[str, Any]:
    """健康检查"""
    return {"success": True, "message": "service is running"}


@app.post("/api/update_record")
def update_record(req: UpdateRecordRequest) -> Dict[str, Any]:
    """编辑回合记录：校验数字范围 -> 重算总和 -> 更新落库"""
    validate_digit(req.num1, "第一位置数字")
    validate_digit(req.num2, "第二位置数字")
    validate_digit(req.num3, "第三位置数字")

    round_no = req.round_no.strip()
    if not round_no:
        raise HTTPException(status_code=400, detail="回合编号不能为空")

    sum_val = req.num1 + req.num2 + req.num3
    updated = db_update_record(req.id, round_no, req.num1, req.num2, req.num3, sum_val)
    if updated is None:
        raise HTTPException(status_code=404, detail="记录不存在或已被删除")
    return {"success": True, "message": "回合记录更新成功", "data": updated}


@app.post("/api/delete_record")
def delete_record(req: DeleteRecordRequest) -> Dict[str, Any]:
    """删除回合记录"""
    deleted = db_delete_record(req.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="记录不存在或已被删除")
    return {"success": True, "message": "回合记录删除成功"}


# 生产环境：托管前端构建产物（必须放在 API 路由之后）
if os.path.isdir(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")


@app.on_event("startup")
def on_startup() -> None:
    init_db()

