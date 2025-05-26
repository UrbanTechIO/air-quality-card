# Air-Quality-Card
INSPIRED BY THE FLOWER CARD BY Olen, check his repository (https://github.com/Olen/lovelace-flower-card)


A custom Lovelace card for Home Assistant to display air quality data with healthy ranges.

## Installation (via HACS)

1. Go to HACS → Frontend → Menu (top right) → Custom Repositories
2. Add this repository URL:
https://github.com/UrbanTechIO/air-quality-card
Type: Lovelace

3. Search for **Air Quality Card** in HACS and install
4. Add the following resource to your dashboard:

```yaml
url: /hacsfiles/air-quality-card/air-quality-card.js
type: module
```

# Usage

```yaml
type: custom:air-quality-card
title: Air Quality
entities:
  co2: sensor.your_co2
  voc: sensor.your_voc
  pm25: sensor.your_pm25
  temperature: sensor.your_temp
  humidity: sensor.your_humidity
  rating: sensor.your_rating
```

  OR you may use the UI for picking the entities
  you may leave the Absolute MAX and MIN empty for predefined ranges or change them to what you like

  
