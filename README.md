# Heads Up! style mobile game

Een mobiele webapp voor iPhone en Safari die lokaal wordt gespeeld en als app op het beginscherm kan worden geplaatst.

## Gebruik

1. Open een terminal in deze map.
2. Start de server:

```bash
python -m http.server 3000
```

3. Open op je iPhone in Safari: http://<IP-ADRES-VAN-JE-COMPUTER>:3000
4. Kies in Safari: "Toevoegen aan beginscherm"
5. Speel vanuit de app op je beginscherm.

## Gameplay

- Kies `Kids` of `Volwassenen`
- Start het spel
- Houd de telefoon in portrait mode op je voorhoofd
- Kantel de bovenkant naar beneden = goed, score +1
- Kantel de onderkant naar boven = pas, geen score
- Elke ronde duurt 90 seconden

## Opmerking

Safari vraagt soms toestemming voor motion/orientation. De tilt-thresholds kunnen op verschillende telefoons iets afwijken; als nodig kun je die in `script.js` aanpassen.
