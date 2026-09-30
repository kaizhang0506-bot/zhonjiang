"""SQLite 数据访问层：数字回合统计小游戏

表结构：
- id: 主键自增
- round_no: 回合编号
- num1/num2/num3: 三个位置的数字(0-9)
- sum_val: 三个数字总和
- create_time: 录入时间
"""
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, Iterator, List, Optional

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "records.db")


def get_conn() -> sqlite3.Connection:
    """获取 SQLite 连接（自动建库目录）"""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def db_cursor() -> Iterator[sqlite3.Connection]:
    """连接上下文：自动提交/回滚并关闭连接"""
    conn = get_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """初始化数据表（幂等）"""
    with db_cursor() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                round_no TEXT NOT NULL,
                num1 INTEGER NOT NULL,
                num2 INTEGER NOT NULL,
                num3 INTEGER NOT NULL,
                sum_val INTEGER NOT NULL,
                create_time TEXT NOT NULL
            )
            """
        )


def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "round_no": row["round_no"],
        "num1": row["num1"],
        "num2": row["num2"],
        "num3": row["num3"],
        "sum_val": row["sum_val"],
        "create_time": row["create_time"],
    }


def db_add_record(round_no: str, num1: int, num2: int, num3: int, sum_val: int) -> Dict[str, Any]:
    """新增一条回合记录，返回完整记录"""
    create_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with db_cursor() as conn:
        cur = conn.execute(
            "INSERT INTO records (round_no, num1, num2, num3, sum_val, create_time) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (round_no, num1, num2, num3, sum_val, create_time),
        )
        row_id = cur.lastrowid
        row = conn.execute("SELECT * FROM records WHERE id = ?", (row_id,)).fetchone()
        return _row_to_dict(row)


def db_get_page(page: int, page_size: int) -> Dict[str, Any]:
    """分页获取回合记录，按录入时间倒序（最新在前）"""
    with db_cursor() as conn:
        total = conn.execute("SELECT COUNT(*) AS cnt FROM records").fetchone()["cnt"]
        offset = (page - 1) * page_size
        rows = conn.execute(
            "SELECT * FROM records ORDER BY id DESC LIMIT ? OFFSET ?",
            (page_size, offset),
        ).fetchall()
        return {
            "list": [_row_to_dict(r) for r in rows],
            "total": total,
            "page": page,
            "page_size": page_size,
        }


def db_get_all() -> List[Dict[str, Any]]:
    """读取全部历史数据（用于分位置独立统计）"""
    with db_cursor() as conn:
        rows = conn.execute("SELECT * FROM records ORDER BY id ASC").fetchall()
        return [_row_to_dict(r) for r in rows]


def db_update_record(
    record_id: int, round_no: str, num1: int, num2: int, num3: int, sum_val: int
) -> Optional[Dict[str, Any]]:
    """编辑回合记录（重算后的 sum_val 由调用方传入），返回更新后的完整记录"""
    with db_cursor() as conn:
        cur = conn.execute(
            "UPDATE records SET round_no = ?, num1 = ?, num2 = ?, num3 = ?, sum_val = ? WHERE id = ?",
            (round_no, num1, num2, num3, sum_val, record_id),
        )
        if cur.rowcount == 0:
            return None
        row = conn.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()
        return _row_to_dict(row)


def db_delete_record(record_id: int) -> bool:
    """删除回合记录，返回是否删除成功"""
    with db_cursor() as conn:
        cur = conn.execute("DELETE FROM records WHERE id = ?", (record_id,))
        return cur.rowcount > 0

