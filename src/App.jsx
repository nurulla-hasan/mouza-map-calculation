import React from 'react'
import MapCalculator from './components/MapCalculator'
import { Toaster } from 'sonner'

export default function App() {
  return (
    <>
      <Toaster richColors position="top-center" />
      <MapCalculator />
    </>
  )
}