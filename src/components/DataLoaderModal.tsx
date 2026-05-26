import { useState } from 'react'
import { Modal, Stepper, Button, Group, Text, Paper, rem } from '@mantine/core'
import { motion } from 'framer-motion'
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
  const bothLoaded = phoneLoaded && contactsLoaded

  const handleClose = () => {
    setStep(0)
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Load Data"
      size="lg"
      radius="xl"
      closeOnClickOutside={false}
    >
      <Stepper
        active={step}
        onStepClick={setStep}
        allowNextStepsSelect={false}
        size="sm"
      >
        <Stepper.Step
          label="Phone Numbers"
          description={phoneLoaded ? `${phoneCount} numbers` : 'Upload CSV'}
          completedIcon={undefined}
        >
          <Paper bg="transparent" py="md">
            <FileUpload
              label="Phone Numbers"
              onFile={onPhonesUpload}
              loaded={phoneLoaded}
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
              onFile={onContactsUpload}
              loaded={contactsLoaded}
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
          {step < 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 ? !phoneLoaded : !contactsLoaded}
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
