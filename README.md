# 🏁 Car Racing Game

A fun and interactive car racing game built with HTML5 Canvas and JavaScript, featuring mobile gesture controls, AI opponents, and customizable tracks.

## 🎮 Play Now!

**🌐 Live Demo**: [https://shaymark.github.io/car-racing-game/](https://shaymark.github.io/car-racing-game/)

## 🎮 Features

### **Gameplay**
- **3-Lap Racing**: Complete 3 laps to finish the race
- **AI Opponents**: Race against 3 AI cars with different behaviors
- **Checkpoint System**: Navigate through checkpoints to progress
- **Boost System**: Limited boost for strategic speed bursts
- **Off-Track Penalties**: Stay on track or face time penalties

### **Controls**

#### **Desktop Controls**
- **Arrow Keys** or **WASD**: Drive and steer
- **Space**: Activate boost
- **R**: Restart race
- **D**: Toggle debug mode
- **M**: Toggle mobile controls (for testing)

#### **Mobile Controls**
- **Left Gesture Area** (Green): 
  - ⬆️ Swipe Up = Accelerate
  - ⬇️ Swipe Down = Brake/Reverse
- **Right Gesture Area** (Blue):
  - ⬅️ Swipe Left = Turn Left
  - ➡️ Swipe Right = Turn Right
- **Boost Button** (Orange): Tap to activate boost
- **Multi-Touch Support**: Use both gesture areas simultaneously

### **Difficulty Levels**
- **Easy Mode**: AI max speed 0.2 pixels/frame, turn speed 30%, stuck timeout 10-15s
- **Hard Mode**: AI max speed 8 pixels/frame, turn speed 80%, stuck timeout 2-3s

### **Track System**
- **Default Track**: Built-in racing circuit
- **Custom Tracks**: Create your own tracks using the track editor
- **Track Loading**: Load custom track files (.json format)
- **Collision Detection**: Advanced collision system for custom tracks

## 🚀 Getting Started

### **Prerequisites**
- Modern web browser with HTML5 Canvas support
- Local web server (for custom track loading)

### **Installation**
1. Clone the repository:
   ```bash
   git clone https://github.com/shaymark/car-racing-game.git
   cd car-racing-game
   ```

2. Start a local web server:
   ```bash
   python3 -m http.server 8000
   # or
   npx serve .
   # or
   php -S localhost:8000
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## 🎨 Track Editor

Access the track editor by clicking the "🎨 Track Editor" button in the game. Features include:

- **Freehand Drawing**: Draw custom tracks with your mouse/touch
- **Line and Curve Tools**: Create straight lines and curves
- **Checkpoint Placement**: Add checkpoints for race progression
- **Track Customization**: Choose colors and widths
- **Export/Import**: Save and load custom tracks

## 📱 Mobile Experience

The game is optimized for mobile devices with:

- **Responsive Design**: Adapts to different screen sizes
- **Touch Gestures**: Intuitive swipe controls
- **Multi-Touch Support**: Use both thumbs simultaneously
- **Visual Feedback**: Clear indicators for active controls
- **Auto-Detection**: Controllers appear automatically on mobile devices

## 🏗️ Technical Details

### **Architecture**
- **Vanilla JavaScript**: No external dependencies
- **HTML5 Canvas**: Smooth 2D graphics rendering
- **CSS3**: Modern styling with animations
- **Local Storage**: Persistent track data

### **Performance**
- **60 FPS Game Loop**: Smooth gameplay
- **Optimized Rendering**: Efficient canvas operations
- **Touch Event Handling**: Responsive mobile controls
- **Memory Management**: Clean object lifecycle

### **Browser Compatibility**
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🎯 Game Mechanics

### **Car Physics**
- **Acceleration/Deceleration**: Realistic speed changes
- **Turning**: Smooth steering with momentum
- **Collision Detection**: Track boundary enforcement
- **Boost System**: Temporary speed increase

### **AI Behavior**
- **Checkpoint Navigation**: AI follows optimal paths
- **Stuck Detection**: Automatic recovery from obstacles
- **Difficulty Scaling**: Adjustable AI performance
- **Random Variation**: Unique behavior patterns

### **Scoring System**
- **Position Tracking**: Real-time race position
- **Lap Progress**: Percentage completion
- **Checkpoint System**: Progress validation
- **Finish Detection**: Race completion logic

## 🔧 Development

### **File Structure**
```
car-racing-game/
├── index.html          # Main game page
├── game.js             # Core game logic
├── styles.css          # Game styling
├── track-editor.html   # Track editor page
├── track-editor.js     # Editor functionality
├── track-editor-styles.css # Editor styling
├── my_track.json       # Default track data
├── README.md           # This file
└── MOBILE_INSTRUCTIONS.md # Mobile setup guide
```

### **Key Classes**
- `CarRacingGame`: Main game controller
- `Player Car`: User-controlled vehicle
- `AI Cars`: Computer-controlled opponents
- `Track System`: Collision detection and rendering
- `Mobile Controllers`: Touch gesture handling

## 🐛 Debugging

Enable debug mode by pressing `D` to see:
- Collision boundaries
- AI pathfinding
- Performance metrics
- Touch event logging

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

**Enjoy racing! 🏎️💨**