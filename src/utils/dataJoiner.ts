import { ContactRecord, PhoneRecord } from '../types'

function normalizePhone(num: string): string {
  return num.replace(/[^0-9]/g, '')
}

export function joinData(
  contacts: ContactRecord[],
  phones: PhoneRecord[]
): ContactRecord[] {
  const phoneMap = new Map<string, PhoneRecord>()

  for (const p of phones) {
    const key = normalizePhone(p.phoneNumber)
    if (key) {
      phoneMap.set(key, p)
    }
  }

  return contacts.map((contact) => {
    const key = normalizePhone(contact.systemPhoneNumber)
    const match = key ? phoneMap.get(key) : undefined

    if (!match) return contact

    return {
      ...contact,
      phoneDescription: match.description,
      phoneType: match.phoneType,
      activeChannels: match.activeChannels,
      contactFlowIvr: match.contactFlowIvr,
      country: match.country,
    }
  })
}
