# RiSA App Icons

## Required Icon Files

For proper app distribution, you need to create the following icon files:

### macOS
- **icon.icns** - 512x512px (or use Apple's recommended sizes)
  - Can be generated from a 1024x1024px PNG using online converters

### Windows  
- **icon.ico** - 256x256px (multi-resolution recommended)
  - Should include sizes: 16x16, 32x32, 48x48, 128x128, 256x256

### Linux
- **icon.png** - 512x512px PNG format

## Icon Design Recommendations

### Theme: RSA Encryption & Security
- **Primary Element**: Lock/Key symbol
- **Secondary Element**: Binary code or encryption symbols  
- **Color Scheme**: Professional blues/grays with security accent colors
- **Style**: Modern, clean, professional

### Design Ideas
1. **Shield + Key**: Security shield with RSA key symbol
2. **Lock + Binary**: Padlock with binary code background
3. **Cipher Wheel**: Classical cipher wheel with modern styling
4. **Encrypted Document**: Document with lock overlay

## Tools for Icon Creation

### Free Options
- **GIMP** - Full-featured image editor
- **Canva** - Online design tool with templates
- **Figma** - Professional design tool (free tier)

### Online Converters
- **CloudConvert** - PNG to ICO/ICNS conversion
- **Favicon.io** - Multi-format icon generator
- **IconConvert** - Batch icon conversion

## Quick Setup

1. Create your main icon as 1024x1024px PNG
2. Use online converters to generate:
   - icon.icns (macOS)
   - icon.ico (Windows) 
   - icon.png (Linux - resize to 512x512)
3. Place files in this directory
4. Run build commands

## Temporary Setup (for testing)

If you don't have icons ready, electron-builder will use default icons, but your app will look unprofessional. Consider using a simple placeholder icon for initial testing.