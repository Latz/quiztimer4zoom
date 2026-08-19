# QuizTimer4Zoom - Keyboard Shortcuts Reference

## Quick Reference

| Key(s) | Action | Notes |
|--------|--------|-------|
| **Space** | Start or Stop timer | Toggle between running and paused states |
| **C** | Continue timer | Resume from paused time |
| **Ctrl+O** (Windows/Linux) or **Cmd+O** (Mac) | Toggle Options Panel | Open or close the settings menu |
| **Escape** | Close Options Panel | Exit settings without saving |
| **Tab** | Next Control | Navigate forward through buttons |
| **Shift+Tab** | Previous Control | Navigate backward through buttons |
| **?** | Show Help | Display all keyboard shortcuts |

---

## Detailed Usage

### Timer Control

#### Start/Stop
- **Press**: `Space`
- **Effect**: Starts the timer if stopped, or stops it if running
- **Visual Feedback**: Button changes text from "Start" to "Stop"
- **Audio Feedback**: Screen reader announces "Timer started" or "Timer stopped"

**Example**:
```
User presses Space
→ Timer starts counting down
→ Button text changes to "Stop"
→ Screen reader: "Timer started"
```

#### Continue
- **Press**: `C`
- **Effect**: Resumes a paused timer from where it left off
- **Use Case**: When you've paused the timer and want to continue

**Example**:
```
User presses Space (timer running)
→ Timer pauses at, say, 45 seconds
User presses C
→ Timer continues from 45 seconds
```

#### Set Duration
- **Press**: `Tab` to navigate to "20 Sek." or "30 Sek." button
- **Then**: `Space` or `Enter` to select

**Available Presets**:
- 20 seconds
- 30 seconds
- Custom duration (set in options)

---

### Options Menu Navigation

#### Open/Close Options
- **Press**: `Ctrl+O` (Windows/Linux) or `Cmd+O` (macOS)
- **Effect**: Toggles options panel open/closed
- **Focus**: Automatically moves to first control when opened
- **Return**: Focus returns to options button when closed

**Example**:
```
User presses Ctrl+O
→ Options panel opens
→ Focus moves to first position button
User presses Escape
→ Options panel closes
→ Focus returns to options button
```

#### Navigate Within Options
- **Tab**: Move to next control (↓)
- **Shift+Tab**: Move to previous control (↑)
- **Escape**: Close options and return focus to options button

**Available Options**:
1. Timer Position (4 position buttons)
2. Timer Size (4 size buttons + display)
3. Colors (9 color pickers + 3 examples)
4. Opacity (1 range slider)

---

### Focus Navigation

#### Tab Through All Controls
Standard Tab navigation moves through controls in order:

**Order**:
```
1. Start/Stop Button (primary)
2. Continue Button
3. 20 Seconds Button
4. 30 Seconds Button
5. Progress Bar (informational)
6. Options Button
7. Help Button
8. Reset Button
```

**When Options Open**:
```
Tab stays within options panel (focus trap)
- Position buttons
- Size buttons
- Color inputs
- Opacity slider
Shift+Tab wraps to last control
```

#### Quick Tab Tricks
- **Skip to options**: Hold Shift and press Tab repeatedly
- **Back to main**: Press Escape in options to return to main interface
- **Jump to help**: Tab through to Help button for documentation

---

### Help & Documentation

#### Display Keyboard Help
- **Press**: `?` (question mark)
- **Effect**: Screen reader announces all available shortcuts
- **Browser Console**: Shortcuts also logged to developer console
- **No Interference**: Help doesn't interrupt current operation

**Example**:
```
User presses ?
→ Screen reader announces:
   "Keyboard Shortcuts: Space: Start/Stop timer. C: Continue timer..."
```

---

## Accessibility Features

### Screen Reader Integration

All keyboard actions trigger announcements:

| Action | Screen Reader Announcement |
|--------|---------------------------|
| Press Space (timer stopped) | "Timer started. Button pressed." |
| Press Space (timer running) | "Timer stopped. Button pressed." |
| Press C | "Continue timer. Button pressed." |
| Open Options | "Options panel opened. Press Escape to close." |
| Close Options | "Options panel closed." |
| Change duration | "Timer duration set to 20 seconds" |
| Change position | "Timer position changed to top right" |
| Change opacity | "Opacity set to 85%" |

### Focus Indicators

All keyboard navigation shows visible focus indicator:
- **Outline**: 3px solid blue line
- **Offset**: 2px from element edges
- **Shadow**: Additional light blue glow
- **Visibility**: Always visible, never hidden

---

## Tips & Tricks

### Power User Workflow

**Scenario**: Quick timer for 30 seconds

```
1. Press Ctrl+O to open options (if needed to change settings)
2. Press Tab multiple times to navigate to 30 Sec button
3. Press Space to confirm duration
4. Press Escape to close options
5. Press Space to start timer
6. Wait for countdown
7. Press C if you need more time
8. Press Space to stop when done
```

**Faster**: Skip steps 1-4 if using default 30 seconds
```
1. Press Space (starts default timer)
2. Wait
3. Done!
```

### Customizing Shortcuts

Currently shortcuts are:
- Space/C for timer (standard, not remappable)
- Ctrl+O for options (can be changed if needed)
- ? for help (standard)

**Future**: Custom keybindings may be added

---

## Common Issues & Solutions

### Space Key Not Working

**Problem**: Space bar starts/stops web page scroll instead of timer

**Solution**:
- Click on the timer app first to give it focus
- Or use Tab to navigate within the app
- Then Space should control the timer

**Why**: The app needs focus for keyboard input

### Ctrl+O Conflicts

**Problem**: Browser or OS intercepts Ctrl+O

**Alternative**:
- Use Tab to navigate to Options button
- Press Space to activate it

**Browser Specific**:
- **Chrome**: Ctrl+O opens file dialog - use Tab instead
- **Firefox**: Ctrl+O opens file dialog - use Tab instead
- **Safari**: Cmd+O works on Mac

### Can't Type 'C' or '?'

**Problem**: Nothing happens when pressing C or ?

**Causes**:
- A text input field has focus
- The app window doesn't have focus

**Solution**:
- Click on the timer area first
- Or press Tab to navigate to a button
- Then try again

---

## Accessibility Considerations

### For Users with Motor Disabilities
- No time limits on any action
- Large touch targets (44x44px minimum)
- No double-click required
- Keyboard-only navigation available

### For Users with Visual Impairments
- Screen reader support throughout
- All actions announced
- No color-only indicators
- High contrast mode supported

### For Users with Cognitive Disabilities
- Clear, simple labels
- Consistent behavior
- Logical navigation order
- Help available on demand

### For Users with Hearing Impairments
- No sound required (all via visual/keyboard)
- Text descriptions of all actions
- No time limits

---

## Advanced Features

### High Contrast Mode

If your operating system is in high contrast mode:

**Windows**:
- Settings > Ease of Access > High Contrast
- QuizTimer automatically adapts colors

**macOS**:
- System Preferences > Accessibility > Display > Increase Contrast
- Outlines and borders become thicker

**Linux**:
- Varies by distribution
- CSS automatically detects and adapts

### Dark Mode

If your operating system prefers dark mode:

- Settings > Display > Dark Mode
- QuizTimer automatically switches colors
- Maintains contrast in both light and dark modes

---

## Getting Help

### In-App Help
- Press **?** to see keyboard shortcuts
- Check **Help Button** (❓) in interface
- Review this file for detailed instructions

### Online Resources
- **Full Accessibility Guide**: ACCESSIBILITY.md
- **Implementation Details**: A11Y_IMPLEMENTATION_SUMMARY.md
- **GitHub Issues**: Report problems or suggest improvements

### Keyboard Navigation Help
1. Press Tab to navigate
2. Press Space to activate
3. Press Escape to go back
4. Press ? for shortcuts

---

## Keyboard Shortcut Legend

### Symbols
- **Space** = Spacebar
- **Ctrl** = Control key (Cmd on Mac)
- **Shift** = Shift key
- **Tab** = Tab key
- **Escape** = Escape key
- **C** = Letter C key

### Modifiers
- **Ctrl+O** = Hold Ctrl, press O (together)
- **Cmd+O** = Hold Cmd, press O (together on Mac)
- **Shift+Tab** = Hold Shift, press Tab (together)

---

## Changelog

### Version 1.0 (October 2025)
- ✅ Space: Start/Stop timer
- ✅ C: Continue timer
- ✅ Ctrl+O / Cmd+O: Toggle options
- ✅ Escape: Close options
- ✅ Tab/Shift+Tab: Navigate
- ✅ ?: Show help
- ✅ All actions announced to screen readers

### Future (Planned)
- [ ] Customizable keybindings
- [ ] Voice command support
- [ ] Arrow key navigation within panels
- [ ] Number keys for quick presets (1 = 20s, 2 = 30s, etc.)

---

## Questions?

If you have questions about keyboard shortcuts or accessibility:

1. Check **ACCESSIBILITY.md** for detailed information
2. Press **?** to see shortcuts in-app
3. Open a **GitHub issue** with your question
4. Contact the development team

---

**Last Updated**: October 28, 2025
**Status**: Current and Complete
**Accessibility Standard**: WCAG 2.1 Level AA
