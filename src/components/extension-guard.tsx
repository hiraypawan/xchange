'use client'

import { useEffect } from 'react'

/**
 * Guards against browser extension interference that causes hydration errors
 */
export function ExtensionGuard() {
  useEffect(() => {
    // Remove any attributes added by browser extensions that cause hydration errors
    const cleanUpExtensionAttributes = () => {
      const elementsToClean = document.querySelectorAll('[bis_skin_checked]')
      elementsToClean.forEach(element => {
        element.removeAttribute('bis_skin_checked')
      })
    }

    // Clean up immediately
    cleanUpExtensionAttributes()

    // Set up observer to clean up attributes added by extensions
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const target = mutation.target as Element
          if (target.hasAttribute('bis_skin_checked')) {
            target.removeAttribute('bis_skin_checked')
          }
        }
      })
    })

    // Start observing
    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['bis_skin_checked']
    })

    // Cleanup function
    return () => {
      observer.disconnect()
    }
  }, [])

  return null // This component doesn't render anything
}