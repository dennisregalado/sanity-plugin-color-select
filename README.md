# sanity-plugin-color-picker

A Sanity Studio color field: pick from a curated swatch list or enter a custom color. Stores `{label, value}`.

```ts
import {colorPicker} from 'sanity-plugin-color-picker'

plugins: [colorPicker({colorList: [{label: 'Bone', value: '#F3F0DE'}]})]

defineField({name: 'background', type: 'colorPicker', options: {colorList, allowCustom: true}})
```
