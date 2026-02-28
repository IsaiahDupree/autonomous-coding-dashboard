# AAG Agent 08 — Email Outreach Integration

## Mission
Build the complete email outreach system: email discovery from multiple sources, Claude-generated 3-touch sequences, Resend API sending, open/click/bounce tracking, reply detection, unsubscribe handling, and CAN-SPAM compliance.

## Features to Build
AAG-121 through AAG-150

## Depends On
Agent 01 (migrations — acq_email_sequences, acq_email_discoveries, acq_email_unsubscribes tables), Agent 05 (channel coordinator)

## Working Directory
`/Users/isaiahdupree/Documents/Software/Safari Automation/scripts/acquisition/`

## Output Files
- `acquisition/email_agent.py`
- `acquisition/email/resend_client.py`
- `acquisition/email/discovery.py`
- `acquisition/email/generator.py`
- `acquisition/email/imap_watcher.py`
- `acquisition/email/templates/base.html`
- `acquisition/api/routes/email.py`
- `tests/test_email_agent.py`

## ResendClient
```python
import httpx, os

class ResendClient:
    BASE_URL = "https://api.resend.com"
    
    def __init__(self):
        self.api_key = os.environ["RESEND_API_KEY"]
        self.from_email = os.environ.get("FROM_EMAIL", "outreach@example.com")
    
    async def send_email(self, to: str, subject: str, html: str, text: str) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{self.BASE_URL}/emails",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"from": self.from_email, "to": [to],
                      "subject": subject, "html": html, "text": text}
            )
            if r.status_code == 422:
                raise InvalidEmailError(to)
            if r.status_code == 429:
                raise RateLimitError("resend", retry_after=60)
            r.raise_for_status()
            return r.json()   # {"id": "resend_message_id"}
    
    async def get_email(self, resend_id: str) -> dict:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{self.BASE_URL}/emails/{resend_id}",
                                 headers={"Authorization": f"Bearer {self.api_key}"})
            return r.json()
```

## Email Discovery Sources (priority order)

### 1. LinkedIn Email Extract (AAG-124)
```python
async def extract_linkedin_email(contact: Contact) -> str | None:
    if not contact.linkedin_url:
        return None
    # Navigate LinkedIn profile via LinkedIn automation (port 3105)
    r = await http.post("http://localhost:3105/api/linkedin/profile/extract",
                        {"profileUrl": contact.linkedin_url})
    return r.get("email")  # Only if publicly listed
```

### 2. Website Email Scraper (AAG-125)
```python
async def scrape_website_email(website_url: str) -> str | None:
    email_regex = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    urls_to_check = [website_url, f"{website_url}/contact", f"{website_url}/about"]
    for url in urls_to_check:
        try:
            async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "Mozilla/5.0"}) as c:
                r = await c.get(url)
                emails = re.findall(email_regex, r.text)
                # Filter out common false positives
                valid = [e for e in emails if not any(x in e for x in ['example','placeholder','schema'])]
                if valid:
                    return valid[0]
        except Exception:
            continue
    return None
```

### 3. Pattern Guesser (AAG-126)
```python
PATTERNS = [
    lambda f, l, d: f"{f}@{d}",
    lambda f, l, d: f"{f}.{l}@{d}",
    lambda f, l, d: f"{f[0]}{l}@{d}",
    lambda f, l, d: f"{f}{l[0]}@{d}",
]
def guess_emails(display_name: str, domain: str) -> list[EmailCandidate]:
    parts = display_name.lower().split()
    first, last = parts[0], parts[-1] if len(parts) > 1 else parts[0]
    return [EmailCandidate(email=p(first, last, domain), confidence=0.4, source='pattern')
            for p in PATTERNS]
```

### 4. Perplexity Email Search (AAG-127)
```python
async def search_email_perplexity(contact: Contact) -> str | None:
    query = f"What is the email address for {contact.display_name} the {contact.niche_label} creator?"
    result = await perplexity_client.search(query)
    # Parse email from result text
    emails = re.findall(email_regex, result)
    return emails[0] if emails else None
```

### 5. Email Verifier (AAG-128)
```python
import dns.resolver, smtplib

async def verify_email(email: str) -> VerifyResult:
    domain = email.split('@')[1]
    # Skip SMTP for major providers (they block it)
    SKIP_SMTP = {'gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com'}
    
    # MX check
    try:
        mx = dns.resolver.resolve(domain, 'MX')
        mx_valid = len(mx) > 0
    except Exception:
        return VerifyResult(verified=False, mx_valid=False)
    
    if domain in SKIP_SMTP:
        return VerifyResult(verified=True, mx_valid=True)  # Trust format
    
    # SMTP RCPT TO check (no actual send)
    try:
        mx_host = str(sorted(mx, key=lambda r: r.preference)[0].exchange)
        with smtplib.SMTP(mx_host, 25, timeout=10) as s:
            s.helo('verify.example.com')
            s.mail('verify@example.com')
            code, _ = s.rcpt(email)
            return VerifyResult(verified=code == 250, mx_valid=True)
    except Exception:
        return VerifyResult(verified=False, mx_valid=True)
```

## Email Generator

### HTML Template (base.html)
```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6;max-width:600px;margin:0 auto;padding:20px}
.footer{margin-top:40px;font-size:12px;color:#888;border-top:1px solid #eee;padding-top:16px}
a{color:#0070f3}
</style></head>
<body>
{body_html}
<div class="footer">
  <p>You received this because your profile matched our research on {niche}.</p>
  <p><a href="{unsubscribe_url}">Unsubscribe</a> | {physical_address}</p>
</div>
</body>
</html>
```

### Claude Prompts (3 touches, per PRD-027)
Use `claude-3-5-sonnet-20241022` for Touch 1, `claude-3-haiku-20240307` for Touch 2+3.

## EmailAgent.send_pending()
```python
async def send_pending(self, limit=30, dry_run=False):
    pending = await queries.get_pending_email_sequences(limit=limit)
    results = []
    for seq in pending:
        contact = await queries.get_contact(seq.contact_id)
        
        # Check unsubscribed
        if contact.email_opted_out:
            await queries.update_email_sequence_status(seq.id, 'skipped', 'unsubscribed')
            continue
        
        # Check daily cap
        if not await daily_caps.check('email', 'email'):
            await queries.update_email_sequence_status(seq.id, 'skipped', 'daily_cap')
            continue
        
        # Generate body if not pre-generated
        if not seq.body_html:
            draft = await generator.generate(contact, seq.touch_number, seq.service_slug)
            await queries.update_email_draft(seq.id, draft)
        
        if not dry_run:
            result = await resend_client.send_email(seq.to_email, seq.subject, seq.body_html, seq.body_text)
            await queries.update_email_sent(seq.id, result['id'])
            await daily_caps.increment('email', 'email')
            await queries.insert_crm_message(contact_id=seq.contact_id, message_type='email',
                                             is_outbound=True, message_text=seq.body_text)
```

## Resend Webhook Handler
```python
# POST /api/acquisition/email/webhooks/resend
async def handle_resend_webhook(event: dict):
    event_type = event.get('type')  # email.opened, email.clicked, email.bounced, email.complained
    resend_id = event.get('data', {}).get('email_id')
    
    if event_type == 'email.opened':
        await queries.update_email_opened(resend_id)
    elif event_type == 'email.clicked':
        await queries.update_email_clicked(resend_id)
    elif event_type == 'email.bounced':
        await queries.update_email_status(resend_id, 'bounced')
        await queries.set_email_unverified(resend_id)  # contact.email_verified=false
        await channel_coordinator.switch_to_dm(resend_id)
    elif event_type == 'email.complained':
        email = event.get('data', {}).get('to', [''])[0]
        await queries.insert_unsubscribe(email, reason='spam_complaint')
```

## Unsubscribe Token (JWT)
```python
import jwt, datetime
EMAIL_UNSUB_SECRET = os.environ.get("EMAIL_UNSUB_SECRET", "change-this-secret")

def generate_unsub_token(contact_id: str) -> str:
    return jwt.encode(
        {"contact_id": contact_id, "exp": datetime.datetime.utcnow() + datetime.timedelta(days=365)},
        EMAIL_UNSUB_SECRET, algorithm="HS256"
    )

# GET /api/acquisition/email/unsubscribe?token={jwt}
async def handle_unsubscribe(token: str):
    payload = jwt.decode(token, EMAIL_UNSUB_SECRET, algorithms=["HS256"])
    contact_id = payload["contact_id"]
    contact = await queries.get_contact(contact_id)
    await queries.set_email_opted_out(contact_id)
    await queries.cancel_pending_email_sequences(contact_id)
    await queries.insert_unsubscribe(contact.email, reason='self_unsubscribe')
    return HTMLResponse("<h1>You have been unsubscribed.</h1>")
```

## SPAM Word Blacklist
```python
SPAM_WORDS = [
    "free money", "act now", "limited time", "earn extra", "guaranteed", "no risk",
    "increase sales", "make money fast", "click here", "buy now", "order now",
    "special promotion", "exclusive deal", "winner", "congratulations",
    "100% free", "risk free", "cash bonus", "double your", "earn from home"
]
```

## Tests Required
```python
test_email_validator_rejects_spam_words()
test_email_validator_rejects_long_subject()
test_resend_client_handles_422_invalid_email()
test_resend_client_retries_on_429()
test_mx_validator_rejects_invalid_domain()
test_bounce_webhook_switches_channel_to_dm()
test_unsubscribe_token_roundtrip()
test_opted_out_contact_not_emailed()
test_daily_cap_blocks_at_30()
test_crm_message_written_after_send()
```
