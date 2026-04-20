const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','guerrillamail.net','guerrillamail.org',
  'guerrillamail.biz','guerrillamail.de','guerrillamail.info',
  'tempmail.com','temp-mail.org','temp-mail.io','tempmail.net',
  '10minutemail.com','10minutemail.net','10minutemail.org',
  'yopmail.com','yopmail.fr','cool.fr.nf','jetable.fr.nf',
  'sharklasers.com','guerrillamailblock.com','grr.la','spam4.me',
  'trashmail.com','trashmail.me','trashmail.net','trashmail.at',
  'trashmail.io','trashmail.org','trashmail.xyz',
  'throwam.com','throwam.net','dispostable.com','mailnull.com',
  'spamgourmet.com','spamgourmet.net','spamgourmet.org',
  'maildrop.cc','mailnesia.com','mailnull.com','spamoff.de',
  'spamhereplease.com','spamhereplease.net',
  'fakeinbox.com','fakeinbox.net','fakeinbox.org',
  'getairmail.com','filzmail.com','zetmail.com',
  'mohmal.com','discard.email','spamfree24.org',
  'mailexpire.com','mailexpire.net','mailexpire.org',
  'mytrashmail.com','notmailinator.com','sofort-mail.de',
  'tempr.email','getnada.com','mailtemp.net','emailondeck.com',
  'tempemail.net','tempemail.co','burnermail.io','spamgrap.com',
])

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  return DISPOSABLE_DOMAINS.has(domain)
}
