import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'
import { facilityCodeFromName } from '../src/lib/audit'

const FACILITIES = [
  { name: 'Korle Bu Teaching Hospital', type: 'Teaching Hospital', location: 'Accra', region: 'Greater Accra', contactPhone: '+233302665321', contactEmail: 'admin@korlebu.gov.gh' },
  { name: 'Komfo Anokye Teaching Hospital', type: 'Teaching Hospital', location: 'Kumasi', region: 'Ashanti', contactPhone: '+233322400110', contactEmail: 'admin@kath.gov.gh' },
  { name: 'Greater Accra Regional Hospital', type: 'Regional Hospital', location: 'Accra', region: 'Greater Accra', contactPhone: '+233302290143', contactEmail: 'admin@garh.gov.gh' },
  { name: 'Alajo Community Clinic', type: 'Clinic', location: 'Accra', region: 'Greater Accra', contactPhone: '+233302227788', contactEmail: 'info@alajoclinic.gov.gh' },
  { name: 'Tamale Teaching Hospital', type: 'Teaching Hospital', location: 'Tamale', region: 'Northern', contactPhone: '+233372090221', contactEmail: 'admin@tth.gov.gh' },
  { name: 'Cape Coast District Hospital', type: 'District Hospital', location: 'Cape Coast', region: 'Central', contactPhone: '+233332131188', contactEmail: 'admin@ccdh.gov.gh' },
]

const USERS_BY_ROLE = [
  { role: 'BBO', name: 'Blood Bank Officer', password: 'Bbo@2026' },
  { role: 'LAB_TECH', name: 'Laboratory Technician', password: 'Lab@2026' },
  { role: 'HOSP_ADMIN', name: 'Hospital Administrator', password: 'Hosp@2026' },
  { role: 'NURSE_DOCTOR', name: 'Nurse / Doctor', password: 'Nurse@2026' },
]

const DONOR_NAMES = [
  'Kwame Mensah', 'Akosua Asante', 'Yaw Boateng', 'Ama Owusu', 'Kofi Adjei', 'Abena Djan',
  'Ekow Asare', 'Adwoa Frimpong', 'Kwesi Appiah', 'Esi Mensah', 'Kojo Antwi', 'Akua Owusu',
  'Yaw Sarpong', 'Ama Boateng', 'Kofi Asare', 'Abena Osei', 'Ekow Mensah', 'Adwoa Adjei',
  'Kwesi Frimpong', 'Esi Appiah', 'Kojo Djan', 'Akua Antwi', 'Yaw Asante', 'Ama Sarpong',
]

const PATIENT_REFS = [
  'PAT-2026-001', 'PAT-2026-002', 'PAT-2026-003', 'PAT-2026-004', 'PAT-2026-005',
  'PAT-2026-006', 'PAT-2026-007', 'PAT-2026-008', 'PAT-2026-009', 'PAT-2026-010',
]

const WARDS = ['Emergency Ward', 'Maternity Ward', 'Surgical Ward', 'ICU', 'Pediatric Ward']

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const COMPONENT_TYPES = ['Whole Blood', 'Red Blood Cells', 'Platelets', 'Fresh Frozen Plasma']

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randomDate(daysAgo: number, daysAhead = 0): Date {
  const now = new Date()
  const offset = -daysAgo + Math.floor(Math.random() * (daysAgo + daysAhead))
  now.setDate(now.getDate() + offset)
  return now
}

function expiryForComponent(component: string, collectedAt: Date): Date {
  const d = new Date(collectedAt)
  switch (component) {
    case 'Whole Blood': d.setDate(d.getDate() + 35); break
    case 'Red Blood Cells': d.setDate(d.getDate() + 42); break
    case 'Platelets': d.setDate(d.getDate() + 5); break
    case 'Fresh Frozen Plasma': d.setFullYear(d.getFullYear() + 1); break
  }
  return d
}

async function main() {
  console.log('Clearing existing data...')
  await db.auditLog.deleteMany()
  await db.networkResponse.deleteMany()
  await db.networkRequest.deleteMany()
  await db.internalRequest.deleteMany()
  await db.bloodUnit.deleteMany()
  await db.storageUnit.deleteMany()
  await db.donor.deleteMany()
  await db.user.deleteMany()
  await db.facility.deleteMany()
  await db.systemSetting.deleteMany()

  // 1. Platform Office facility for SYS_ADMIN
  const platformOffice = await db.facility.create({
    data: {
      name: 'BBMS Platform Office',
      type: 'Teaching Hospital',
      location: 'Accra',
      region: 'Greater Accra',
      contactPhone: '+233 30 000 0000',
      contactEmail: 'admin@bbms.gh',
      status: 'Active',
    },
  })

  const adminHash = await hashPassword('Admin@2026')
  const sysAdmin = await db.user.create({
    data: {
      email: 'admin@bbms.gh',
      fullName: 'System Administrator',
      passwordHash: adminHash,
      role: 'SYS_ADMIN',
      facilityId: platformOffice.id,
    },
  })

  // 2. Real facilities
  const facilities = []
  for (const f of FACILITIES) {
    const facility = await db.facility.create({
      data: { ...f, status: 'Active' },
    })
    facilities.push(facility)
  }

  // 3. Storage units for each facility
  const storageUnits = []
  for (const f of facilities) {
    const code = facilityCodeFromName(f.name)
    const r1 = await db.storageUnit.create({
      data: { facilityId: f.id, name: `${code}-REF-01 (Blood Bank Fridge)`, tempCategory: 'Refrigerated', temperatureC: 4, maxCapacity: 100 },
    })
    const r2 = await db.storageUnit.create({
      data: { facilityId: f.id, name: `${code}-FRZ-01 (Plasma Freezer)`, tempCategory: 'Frozen', temperatureC: -25, maxCapacity: 60 },
    })
    const r3 = await db.storageUnit.create({
      data: { facilityId: f.id, name: `${code}-RM-01 (Room Temp Storage)`, tempCategory: 'Room Temperature', temperatureC: 22, maxCapacity: 40 },
    })
    storageUnits.push({ facility: f, units: [r1, r2, r3] })
  }

  // 4. Users for each facility - one of each role (except SYS_ADMIN)
  const allUsers = []
  for (const f of facilities) {
    const code = facilityCodeFromName(f.name).toLowerCase()
    const localPart = code.replace(/[^a-z0-9]/g, '')
    for (const u of USERS_BY_ROLE) {
      const email = u.role === 'BBO' ? `bbo@${localPart}.bbms.gh`
                  : u.role === 'LAB_TECH' ? `lab@${localPart}.bbms.gh`
                  : u.role === 'HOSP_ADMIN' ? `hospadmin@${localPart}.bbms.gh`
                  : `nurse@${localPart}.bbms.gh`
      const userHash = await hashPassword(u.password)
      const user = await db.user.create({
        data: {
          email,
          fullName: `${u.name} (${f.name})`,
          passwordHash: userHash,
          role: u.role,
          facilityId: f.id,
        },
      })
      allUsers.push({ user, role: u.role, facility: f })
    }
  }

  // 5. Donors per facility
  for (const f of facilities) {
    const count = 6 + Math.floor(Math.random() * 4)
    for (let i = 0; i < count; i++) {
      const donorBg = pick(BLOOD_GROUPS)
      await db.donor.create({
        data: {
          facilityId: f.id,
          fullName: pick(DONOR_NAMES) + ' ' + pick(['Jr.', 'Sr.', '']),
          phone: `+233 24 ${Math.floor(1000000 + Math.random() * 8999999)}`,
          email: `donor${Math.floor(Math.random() * 999)}@example.com`,
          dateOfBirth: randomDate(365 * 35, 0),
          bloodGroup: donorBg,
          rhesus: donorBg.endsWith('+') ? '+' : '-',
          lastDonationAt: randomDate(60),
          consentGiven: true,
        },
      })
    }
  }

  // 6. Blood units per facility
  let unitCounter = 1
  for (const f of facilities) {
    const bbo = allUsers.find(u => u.role === 'BBO' && u.facility.id === f.id)!.user
    const donors = await db.donor.findMany({ where: { facilityId: f.id } })
    const fStorage = storageUnits.find(s => s.facility.id === f.id)!.units
    const code = facilityCodeFromName(f.name)
    const unitCount = 25 + Math.floor(Math.random() * 15)
    for (let i = 0; i < unitCount; i++) {
      const component = pick(COMPONENT_TYPES)
      const collectedAt = randomDate(40, 0)
      const expiry = expiryForComponent(component, collectedAt)
      const donor = pick(donors)
      const storage = component === 'Fresh Frozen Plasma' ? fStorage[1] : fStorage[0]
      const bg = donor.bloodGroup
      const isExpired = new Date() > expiry
      let status: string
      if (isExpired) status = 'Expired'
      else if (Math.random() < 0.05) status = 'Reserved'
      else if (Math.random() < 0.05) status = 'Issued'
      else if (Math.random() < 0.02) status = 'Discarded'
      else status = 'Available'
      const unitCode = `${code}-BU-${String(unitCounter++).padStart(5, '0')}`
      await db.bloodUnit.create({
        data: {
          unitCode,
          facilityId: f.id,
          donorId: donor.id,
          storageUnitId: storage.id,
          bloodGroup: bg,
          rhesus: donor.rhesus,
          componentType: component,
          collectionDate: collectedAt,
          expiryDate: expiry,
          status,
          registeredById: bbo.id,
        },
      })
    }
  }

  // 7. Internal requests per facility
  for (const f of facilities) {
    const nurse = allUsers.find(u => u.role === 'NURSE_DOCTOR' && u.facility.id === f.id)!.user
    const requestCount = 3 + Math.floor(Math.random() * 4)
    for (let i = 0; i < requestCount; i++) {
      const bg = pick(BLOOD_GROUPS)
      const urgency = pick(['Routine', 'Urgent', 'Emergency'])
      const createdAt = randomDate(20)
      const status = pick(['Pending', 'Pending', 'Approved', 'Issued', 'Rejected', 'Cancelled'])
      await db.internalRequest.create({
        data: {
          facilityId: f.id,
          requestedById: nurse.id,
          bloodGroup: bg,
          rhesus: bg.endsWith('+') ? '+' : '-',
          componentType: pick(COMPONENT_TYPES),
          quantity: 1 + Math.floor(Math.random() * 3),
          urgency,
          patientRef: pick(PATIENT_REFS),
          patientName: pick(DONOR_NAMES),
          ward: pick(WARDS),
          status,
          createdAt,
          updatedAt: createdAt,
        },
      })
    }
  }

  // 8. Network requests
  let netReqCounter = 1
  const requestingFacility = facilities[3] // Alajo Community Clinic
  const bboReq = allUsers.find(u => u.role === 'BBO' && u.facility.id === requestingFacility.id)!.user
  const netRequestsData = [
    { bg: 'O-', component: 'Red Blood Cells', qty: 2, urgency: 'Emergency', status: 'Open' },
    { bg: 'A+', component: 'Whole Blood', qty: 1, urgency: 'Urgent', status: 'Partially Responded' },
    { bg: 'B+', component: 'Platelets', qty: 1, urgency: 'Emergency', status: 'Reserved' },
    { bg: 'AB-', component: 'Fresh Frozen Plasma', qty: 3, urgency: 'Routine', status: 'Fulfilled' },
  ]

  for (const nr of netRequestsData) {
    const createdAt = randomDate(15)
    const requestCode = `${facilityCodeFromName(requestingFacility.name)}-NR-${String(netReqCounter++).padStart(5, '0')}`
    const networkReq = await db.networkRequest.create({
      data: {
        requestCode,
        facilityId: requestingFacility.id,
        requestedById: bboReq.id,
        bloodGroup: nr.bg,
        rhesus: nr.bg.endsWith('+') ? '+' : '-',
        componentType: nr.component,
        quantity: nr.qty,
        urgency: nr.urgency,
        patientRef: pick(PATIENT_REFS),
        noteToFacilities: 'Urgent need for patient transfusion. Please respond ASAP.',
        status: nr.status,
        reservationExpiryHours: 24,
        createdAt,
        updatedAt: createdAt,
      },
    })

    if (nr.status !== 'Open') {
      const respondingFacilities = facilities.filter(f => f.id !== requestingFacility.id).slice(0, 2 + Math.floor(Math.random() * 2))
      for (const rf of respondingFacilities) {
        const matchingUnit = await db.bloodUnit.findFirst({
          where: { facilityId: rf.id, bloodGroup: nr.bg, status: 'Available' },
        })
        if (matchingUnit) {
          await db.networkResponse.create({
            data: {
              networkRequestId: networkReq.id,
              respondingFacilityId: rf.id,
              offeredUnitId: matchingUnit.id,
              responderNote: `Available at ${rf.name}. Ready for transport.`,
              status: nr.status === 'Reserved' || nr.status === 'Fulfilled' ? pick(['Selected', 'Rejected']) : 'Pending',
              createdAt: randomDate(12),
            },
          })
        }
      }
    }
  }

  // 9. System settings
  await db.systemSetting.create({ data: { key: 'expiry_alert_days', value: '5', description: 'Days before expiry to trigger alert' } })
  await db.systemSetting.create({ data: { key: 'low_stock_threshold', value: '5', description: 'Minimum stock per blood group' } })
  await db.systemSetting.create({ data: { key: 'reservation_default_hours', value: '24', description: 'Default reservation period in hours' } })

  console.log('Seed completed successfully!')
  console.log(`Facilities: ${facilities.length + 1}`)
  console.log(`Users: ${1 + allUsers.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
