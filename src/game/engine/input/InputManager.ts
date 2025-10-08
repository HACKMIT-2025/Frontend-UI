export interface InputState {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  jump: boolean
  run: boolean
  action: boolean
}

export class InputManager {
  private keys: Map<string, boolean> = new Map()
  private touches: Map<number, { x: number; y: number }> = new Map()
  private inputState: InputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    run: false,
    action: false
  }

  constructor() {
    this.initializeKeyboardListeners()
    this.initializeTouchListeners()
  }

  private initializeKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys.set(e.code, true)
      this.updateInputState()

      // Prevent default for game keys
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        e.preventDefault()
      }
    })

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false)
      this.updateInputState()
    })

    // Clear keys when window loses focus
    window.addEventListener('blur', () => {
      this.keys.clear()
      this.resetInputState()
    })
  }

  private initializeTouchListeners() {
    const canvas = document.getElementById('game-canvas')
    if (!canvas) return

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      Array.from(e.touches).forEach(touch => {
        this.touches.set(touch.identifier, { x: touch.clientX, y: touch.clientY })
      })
      this.updateTouchInput()
    })

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      Array.from(e.touches).forEach(touch => {
        this.touches.set(touch.identifier, { x: touch.clientX, y: touch.clientY })
      })
      this.updateTouchInput()
    })

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault()
      Array.from(e.changedTouches).forEach(touch => {
        this.touches.delete(touch.identifier)
      })
      this.updateTouchInput()
    })
  }

  private updateInputState() {
    // Keyboard mappings
    this.inputState.left = this.keys.get('ArrowLeft') || this.keys.get('KeyA') || false
    this.inputState.right = this.keys.get('ArrowRight') || this.keys.get('KeyD') || false
    this.inputState.up = this.keys.get('ArrowUp') || this.keys.get('KeyW') || false
    this.inputState.down = this.keys.get('ArrowDown') || this.keys.get('KeyS') || false
    this.inputState.jump = this.keys.get('Space') || this.keys.get('KeyJ') || false
    this.inputState.run = this.keys.get('ShiftLeft') || this.keys.get('ShiftRight') || false
    this.inputState.action = this.keys.get('KeyX') || this.keys.get('KeyK') || false
  }

  private updateTouchInput() {
    // Reset touch input
    this.inputState.left = false
    this.inputState.right = false
    this.inputState.jump = false
    this.inputState.run = false

    const canvas = document.getElementById('game-canvas')
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const canvasWidth = rect.width
    const canvasHeight = rect.height

    this.touches.forEach(touch => {
      const x = touch.x - rect.left
      const y = touch.y - rect.top

      // Left side of screen for movement
      if (x < canvasWidth / 2) {
        if (x < canvasWidth / 4) {
          this.inputState.left = true
        } else {
          this.inputState.right = true
        }
      }
      // Right side for jump
      else {
        if (y < canvasHeight / 2) {
          this.inputState.jump = true
        } else {
          this.inputState.run = true
        }
      }
    })
  }

  private resetInputState() {
    this.inputState = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      run: false,
      action: false
    }
  }

  public getInput(): InputState {
    return { ...this.inputState }
  }

  public isKeyPressed(key: string): boolean {
    return this.keys.get(key) || false
  }

  public reset() {
    this.keys.clear()
    this.touches.clear()
    this.resetInputState()
  }

  // Virtual gamepad for mobile
  public createVirtualGamepad() {
    const gamepadHTML = `
      <div id="virtual-gamepad" style="position: fixed; bottom: 20px; left: 0; right: 0; z-index: 1000; display: none;">
        <div style="position: absolute; left: 20px; bottom: 20px;">
          <button class="gamepad-btn" id="btn-left" style="position: absolute; left: 0; top: 30px;">◀</button>
          <button class="gamepad-btn" id="btn-right" style="position: absolute; left: 60px; top: 30px;">▶</button>
          <button class="gamepad-btn" id="btn-up" style="position: absolute; left: 30px; top: 0;">▲</button>
          <button class="gamepad-btn" id="btn-down" style="position: absolute; left: 30px; top: 60px;">▼</button>
        </div>
        <div style="position: absolute; right: 20px; bottom: 20px;">
          <button class="gamepad-btn" id="btn-jump" style="position: absolute; right: 60px; bottom: 30px;">A</button>
          <button class="gamepad-btn" id="btn-action" style="position: absolute; right: 0; bottom: 30px;">B</button>
        </div>
      </div>
    `

    const style = document.createElement('style')
    style.textContent = `
      .gamepad-btn {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.7);
        border: 2px solid #333;
        font-size: 20px;
        font-weight: bold;
        touch-action: none;
        user-select: none;
      }
      .gamepad-btn:active {
        background: rgba(255, 255, 255, 0.9);
      }
      @media (max-width: 768px) {
        #virtual-gamepad {
          display: block !important;
        }
      }
    `
    document.head.appendChild(style)

    const container = document.createElement('div')
    container.innerHTML = gamepadHTML
    document.body.appendChild(container.firstElementChild!)

    // Add touch event listeners to buttons
    this.initializeVirtualButtons()
  }

  private initializeVirtualButtons() {
    const buttons = [
      { id: 'btn-left', key: 'ArrowLeft' },
      { id: 'btn-right', key: 'ArrowRight' },
      { id: 'btn-up', key: 'ArrowUp' },
      { id: 'btn-down', key: 'ArrowDown' },
      { id: 'btn-jump', key: 'Space' },
      { id: 'btn-action', key: 'KeyX' }
    ]

    buttons.forEach(btn => {
      const element = document.getElementById(btn.id)
      if (element) {
        element.addEventListener('touchstart', (e) => {
          e.preventDefault()
          this.keys.set(btn.key, true)
          this.updateInputState()
        })

        element.addEventListener('touchend', (e) => {
          e.preventDefault()
          this.keys.set(btn.key, false)
          this.updateInputState()
        })
      }
    })
  }
}