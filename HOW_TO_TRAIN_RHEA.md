# 🎓 How to Train RHEA - Fix Incorrect Detections

## The Problem You're Seeing

When you hover over a **record button**, RHEA says **"pan control"** - that's WRONG! 😤

**Why does this happen?**
- The script makes educated guesses based on position
- Different REAPER themes arrange controls differently
- Initial detection won't be 100% accurate

## The Solution: TRAIN RHEA! 🧠

This is **exactly** what the learning system is for!

### Step-by-Step Training:

```
1. Hover over the record button
   → RHEA says: "pan control" ❌ WRONG

2. CLICK the record button
   → RHEA learns: "Oh! This is actually a record button!"
   → Saves to training data

3. Hover over it again
   → RHEA says: "record button" ✅ CORRECT!

4. After 5-10 clicks
   → RHEA is 99% confident
   → Always correct from now on!
```

## Quick Training Session (5 Minutes)

Train RHEA on your most-used controls:

### Track 1:
1. Hover + Click **Mute button** (5 times)
2. Hover + Click **Solo button** (5 times)
3. Hover + Click **Record arm** (5 times)
4. Hover + Click **Volume fader** (5 times)
5. Hover + Click **Pan control** (5 times)

### Track 2-5:
Repeat for each track (faster - just 3 clicks each)

**After this**: RHEA will know your layout perfectly! 🎯

## Reload the Improved Script

I just updated the detection zones to be more accurate! To use the new version:

### In REAPER:

1. **Actions → Show action list**
2. Find **"dawrv_mouse_tracker_continuous"**
3. **Select it** and click **"Terminate ReaScript"** (bottom button)
4. **Re-run it** by clicking "Run"

The new script has better guesses, but you'll still want to train it!

## Understanding Confidence Levels

Watch the console to see RHEA learning:

```bash
# First hover (untrained)
🧠 Smart identification (confidence: 50%): Track 2, pan control
     ↑ This is just a guess!

# After 1 click
🎓 LEARNED: record_arm on Track 2
🧠 Smart identification (confidence: 60%): Track 2, record arm

# After 5 clicks
🧠 Smart identification (confidence: 80%): Track 2, record arm

# After 10 clicks
🧠 Smart identification (confidence: 99%): Track 2, record arm
     ↑ RHEA is now CERTAIN!
```

## Pro Tips

### Tip 1: Train in Context
- Train controls in **Track View** (TCP)
- Train same controls in **Mixer View** (MCP)
- RHEA learns different layouts separately!

### Tip 2: Hover Then Click
- **Hover for 500ms** before clicking
- This tells RHEA: "I'm hovering over THIS, then clicking it"
- Quick clicks without hover don't train as well

### Tip 3: Be Consistent
- Always hover over the same spot on a fader
- Click buttons in the center
- Consistent interactions = faster learning

### Tip 4: Watch Console
- Console shows what RHEA detected
- If wrong, click it to correct!
- Watch confidence increase with each click

## What If RHEA Still Gets It Wrong?

Even after training, if RHEA is confused:

### Option 1: Retrain
Just click it 10 more times. The more data, the better!

### Option 2: Reset Training
```bash
rm ~/.dawrv/control-training.json
```
Then train from scratch with correct clicks only.

### Option 3: Adjust Detection Zones
If your REAPER theme is very non-standard, I can help adjust the Lua script's detection zones for your specific layout.

## Different REAPER Themes

If you change REAPER themes, you may need to retrain:
- Different themes arrange controls differently
- RHEA learns layouts per theme
- Just train again with the new theme!

## Training Data Location

All learning is saved here:
```
~/.dawrv/control-training.json
```

You can:
- **Backup**: `cp ~/.dawrv/control-training.json ~/Desktop/rhea-training-backup.json`
- **Share**: Copy to another machine
- **Reset**: `rm ~/.dawrv/control-training.json`

## Summary

**Initial detection isn't perfect** - and that's OK! 👍

The **learning system fixes mistakes**:
1. ❌ RHEA guesses wrong
2. 👆 You click to teach her
3. ✅ RHEA learns and gets it right forever!

**5 minutes of training = lifetime of accurate detection!** 🧠✨

---

**Your Next Steps:**
1. ✅ Reload the improved script in REAPER
2. ✅ Hover over that record button
3. ✅ **CLICK IT** (this teaches RHEA)
4. ✅ Hover again - it should be correct now!
5. ✅ Train other frequently-used controls

**Remember**: Every click makes RHEA smarter! 🎓



