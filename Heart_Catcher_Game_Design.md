# 💖 Project: Heart Catcher (Danidu’s 22nd Birthday Edition)

**Heart Catcher** is a personalized hidden-object adventure designed as a 22nd birthday gift for Danidu. It blends the nostalgic 16-bit aesthetic of **Pokémon Black & White** with a heartwarming narrative driven by "Soso."

---

## 🎨 1. Aesthetic & Sensory Design
* **Visual Style:** 16-bit "Gen 5" Pokémon aesthetic. Features a top-down 2.5D perspective where trees and obstacles have depth, allowing the character to walk behind them.
* **Resolution:** 16-pixel grid-based objects and character sprites.
* **Protagonist:** A custom pixel-art "Trainer Danidu" sprite with smooth 8-directional walking animations.
* **Soundscape:** 16-bit lo-fi remixes of classic Pokémon themes (e.g., *Village Bridge* or *Route 10*). 
* **Feedback (The "Juice"):**
    * **The Rustle:** Grass tiles perform a "squash and stretch" animation when checked.
    * **The Ping:** A high-pitched melodic chime plays upon finding a heart.
    * **The Shine:** A small white sparkle particle effect triggers when a heart is revealed.

---

## 🕹️ 2. Controls & Movement
The game uses a "Smooth-Grid" system to ensure movement feels fluid while remaining precise for hidden-object searching.

| Input Method | Movement | Interact (Check Grass) | Secondary (Run/Menu) |
| :--- | :--- | :--- | :--- |
| **PC (Keyboard)** | Arrow Keys / WASD | **Z** or **Space** | **X** (Open Scrapbook) |
| **Controller** | D-Pad / Left Stick | **A Button** | **B Button** (Run) |
| **Mobile** | Tap-to-Walk | Tap the Tile | Long-press to Run |

* **8-Directional Movement:** Enables diagonal walking for a modern Gen 5 feel.
* **The "Soso" Compass:** A UI proximity sensor that pulses red and vibrates faster as Danidu approaches a hidden heart.

---

## 🔄 3. Core Gameplay Loop
1.  **The Briefing:** Danidu starts at the entrance of a new map (Meadow, Forest, Tundra, etc.).
2.  **The Hunt:** Danidu explores the map, interacting with rustling grass, flowers, or hollow logs to find hearts.
3.  **The Collection:** Locate the required number of hearts for that level.
4.  **The Reward:** Upon finding the final heart, a "Victory" jingle plays, and the screen transitions to the Scrapbook.
5.  **The Scrapbook:** Read a new, personalized message from Soso before proceeding to the next level.

---

## 📈 4. Level Progression & Scaling
The game spans **22 levels** to celebrate Danidu’s 22nd birthday.

### **The Difficulty Curve**
* **Levels 1–5 (Spring):** 20 to 28 hearts. Static objects, clear visibility, and tutorial-style maps.
* **Levels 6–12 (Summer):** 30 to 50 hearts. Introduces "Moving Hearts" that flutter to adjacent tiles when approached.
* **Levels 13–18 (Autumn):** 55 to 80 hearts. Introduces "Decoy" objects (red berries) that trigger a giggling Soso sprite when clicked.
* **Levels 19–21 (Winter):** 85 to 100 hearts. Introduces fog or snow-covered tiles that must be "shoveled" (Z-button) to reveal contents.
* **Level 22 (The Finale):** **22 Golden Hearts.** Each heart represents one year of Danidu's life.

---

## ✨ 5. Powerups & Interactables
* **Running Shoes:** Allows for double-speed exploration.
* **Sweet Scent:** A one-time use item per level that highlights all hearts in the immediate vicinity for 3 seconds.
* **The Mower:** A tool to instantly clear a $3 \times 3$ patch of tall grass.
* **Memory Fragments:** Rare 16-bit "Polaroid" icons that, when collected, show a real-life memory of Danidu and Soso.

---

## 📖 6. "Dancy’s Collection" (The Scrapbook)
This acts as the game’s meta-progression and emotional core.

* **UI Design:** A pixelated, leather-bound book with a heart emblem.
* **Entries:** Each level unlocks a specific page.
    * **Soso’s Message:** Heartfelt notes, inside jokes, or birthday wishes.
    * **Level Stats:** Time taken to complete and hearts collected.
    * **Stamps:** A "Master Catcher" gold stamp for levels completed without hitting decoys.
* **Access:** Can be accessed mid-game via the "X" key to re-read previous messages.

---

## 🏆 7. Win & Lose Scenarios
* **Winning:** Finding all hearts unlocks the next chapter of the story and the scrapbook entry.
* **Soft-Fail Logic:** There are no "Game Overs." If Danidu is stuck, a **"Soso Call"** appears: A small dialogue box pops up with a hint: *"Hey Dancy! I think I saw something sparkling near the big tree in the north!"*

---

## 🎂 8. The Birthday Surprise (Level 22)
The final level transitions from a forest to a **"Birthday Grove"** decorated with pixel balloons.
* Finding the **22nd Golden Heart** triggers a full-screen animation.
* The final page of "Dancy’s Collection" is revealed, containing a final long-form letter from Soso.
* **The "Secret" Interaction:** A final button in the scrapbook reveals a real-world clue or location for his physical birthday gift.
