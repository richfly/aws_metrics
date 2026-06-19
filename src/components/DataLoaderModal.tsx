import { useState } from 'react'
import { Modal, Stepper, Button, Group, Text, Paper } from '@mantine/core'
import { motion } from 'framer-motion'
import { IconDatabase, IconChartBar } from '@tabler/icons-react'
import { FileUpload } from './FileUpload'

interface DataLoaderModalProps {
  opened: boolean
  onClose: () => void
  onPhonesUpload: (text: string) => void
  onContactsUpload: (text: string) => void
  phoneLoaded: boolean
  contactsLoaded: boolean
  phoneCount: number
  contactCount: number
}

export function DataLoaderModal({
  opened,
  onClose,
  onPhonesUpload,
  onContactsUpload,
  phoneLoaded,
  contactsLoaded,
  phoneCount,
  contactCount,
}: DataLoaderModalProps) {
  const [step, setStep] = useState(0)
  const [phoneUploaded, setPhoneUploaded] = useState(false)
  const [contactsUploaded, setContactsUploaded] = useState(false)
  const bothLoaded = phoneLoaded && contactsLoaded

  const handleClose = () => {
    setStep(0)
    setPhoneUploaded(false)
    setContactsUploaded(false)
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Load Data"
      size="lg"
      radius="md"
      closeOnClickOutside={false}
    >
      <Stepper
        active={step}
        onStepClick={setStep}
        allowNextStepsSelect={false}
        size="sm"
      >
        <Stepper.Step label="Get the data" description="Export from AWS">
          <Paper bg="transparent" py="md">
            <Paper p="md" radius="md" withBorder mb="sm">
              <Group gap="sm" mb={6}>
                <IconDatabase size={18} style={{ color: 'var(--mantine-color-blue-6)' }} />
                <Text fw={600} size="sm">Contact Search CSV</Text>
              </Group>
              <Text size="sm" c="dimmed" lh={1.6}>
                Go to <b>Amazon Connect Console → Analytics and Optimization → Contact Search</b>, set filters and date range, then <b>Export → Download CSV</b>.
              </Text>
            </Paper>
            <Paper p="md" radius="md" withBorder>
              <Group gap="sm" mb={6}>
                <IconChartBar size={18} style={{ color: 'var(--mantine-color-teal-6)' }} />
                <Text fw={600} size="sm">Phone Numbers CSV</Text>
              </Group>
              <Text size="sm" c="dimmed" lh={1.6}>
                Go to <b>Amazon Connect Console → Phone Numbers</b> and export the list as CSV.
              </Text>
            </Paper>
          </Paper>
        </Stepper.Step>

        <Stepper.Step
          label="Phone Numbers"
          description={phoneLoaded ? `${phoneCount} numbers` : 'Upload CSV'}
          completedIcon={undefined}
        >
          <Paper bg="transparent" py="md">
            <FileUpload
              label="Phone Numbers"
              onFile={(text) => { onPhonesUpload(text); setPhoneUploaded(true) }}
              loaded={phoneLoaded}
              uploaded={phoneUploaded}
              subtext="Drop phone numbers CSV"
            />
            {phoneLoaded && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Text ta="center" size="sm" c="dimmed" mt="sm">
                  {phoneCount.toLocaleString()} phone numbers loaded
                </Text>
              </motion.div>
            )}
          </Paper>
        </Stepper.Step>

        <Stepper.Step
          label="Contact Search"
          description={contactsLoaded ? `${contactCount} records` : 'Upload CSV'}
          completedIcon={undefined}
        >
          <Paper bg="transparent" py="md">
            <FileUpload
              label="Contact Search Results"
              onFile={(text) => { onContactsUpload(text); setContactsUploaded(true) }}
              loaded={contactsLoaded}
              uploaded={contactsUploaded}
              subtext="Drop the main contact data CSV"
            />
            {contactsLoaded && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Text ta="center" size="sm" c="dimmed" mt="sm">
                  {contactCount.toLocaleString()} contacts loaded
                </Text>
              </motion.div>
            )}
          </Paper>
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between" mt="lg">
        <Button variant="subtle" color="gray" onClick={handleClose}>
          {bothLoaded ? 'Close' : 'Cancel'}
        </Button>
        <Group>
          {step > 0 && (
            <Button variant="light" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 ? !phoneLoaded : false}
            >
              Next
            </Button>
          ) : (
            <Button onClick={handleClose} disabled={!bothLoaded}>
              {bothLoaded ? 'Done' : 'Finish upload first'}
            </Button>
          )}
        </Group>
      </Group>
    </Modal>
  )
}