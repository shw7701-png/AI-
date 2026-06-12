import smtplib
import json
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path


def load_config() -> dict:
    path = Path(__file__).parent / "config.json"
    return json.loads(path.read_text(encoding="utf-8"))["email"]


def send_email(subject: str, html_body: str, config: dict = None) -> None:
    if config is None:
        config = load_config()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = config["sender"]
    msg["To"] = ", ".join(config["recipients"])
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(config["sender"], config["app_password"])
        server.sendmail(config["sender"], config["recipients"], msg.as_string())


def send_warning_email(
    supplier_name: str, days_left: int, next_eval_date: str, config: dict = None
) -> None:
    urgency = "긴급 " if days_left <= 30 else ""
    subject = f"[{urgency}공급업체 재평가 알림] {supplier_name} — D-{days_left}"
    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
      <h2 style="color:#c0392b;">공급업체 재평가 사전 알림</h2>
      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">업체명</td><td style="padding:8px;">{supplier_name}</td></tr>
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">재평가 예정일</td><td style="padding:8px;">{next_eval_date}</td></tr>
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">남은 기간</td><td style="padding:8px;color:#c0392b;font-weight:bold;">{days_left}일</td></tr>
      </table>
      <p style="margin-top:16px;">재평가 준비를 진행해 주세요.</p>
    </div>
    """
    send_email(subject, body, config)


def send_evaluation_email(
    supplier_name: str,
    report_html: str,
    grade: str,
    total_score: float,
    result: str,
    next_eval_date: str,
    config: dict = None,
) -> None:
    subject = f"[공급업체 자동 평가 완료] {supplier_name} — {grade}등급 ({total_score}점) {result}"
    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:800px;margin:auto;">
      <h2>공급업체 자동 평가 완료</h2>
      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">업체명</td><td style="padding:8px;">{supplier_name}</td></tr>
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">등급</td><td style="padding:8px;font-weight:bold;">{grade}등급 ({total_score}점)</td></tr>
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">평가 결과</td><td style="padding:8px;">{result}</td></tr>
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">차기 평가 예정일</td><td style="padding:8px;">{next_eval_date}</td></tr>
      </table>
      <hr style="margin:24px 0;">
      <h3>상세 보고서</h3>
      {report_html}
    </div>
    """
    send_email(subject, body, config)
