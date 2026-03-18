'use client'

import { useEffect } from 'react'

/**
 * Patches Node.prototype.removeChild and insertBefore to silently ignore
 * the "node is not a child" error caused by browser translation tools
 * (e.g. Google Translate) mutating the DOM in a way that breaks React reconciliation.
 */
export function DomPatchProvider() {
  useEffect(() => {
    const originalRemoveChild = Node.prototype.removeChild

    Node.prototype.removeChild = function <T extends Node>(child: T): T {
      if (child.parentNode !== this) {
        // Node was already moved/removed by browser translation – silently skip
        return child
      }
      return originalRemoveChild.call(this, child) as T
    }

    const originalInsertBefore = Node.prototype.insertBefore

    Node.prototype.insertBefore = function <T extends Node>(
      newNode: T,
      referenceNode: Node | null,
    ): T {
      if (referenceNode && referenceNode.parentNode !== this) {
        // referenceNode was moved inside a <font> or similar wrapper by browser translation.
        // Instead of appending to the end (which causes value accumulation),
        // find the wrapper that is still a direct child of `this` and insert before it.
        // This keeps the new node in roughly the correct DOM position.
        let wrapper: Node | null = referenceNode.parentNode
        while (wrapper && wrapper.parentNode !== this) {
          wrapper = wrapper.parentNode
        }
        if (wrapper && wrapper.parentNode === this) {
          // Insert new node before the translation wrapper — correct position preserved
          try {
            return originalInsertBefore.call(this, newNode, wrapper) as T
          } catch {
            // If still fails, fall through to appendChild
          }
        }
        // Last resort: append (avoids crash but may still accumulate in rare edge cases)
        return this.appendChild(newNode) as T
      }
      return originalInsertBefore.call(this, newNode, referenceNode) as T
    }

    // No cleanup needed – patch should stay for the lifetime of the page
  }, [])

  return null
}
