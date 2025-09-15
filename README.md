# Neutron Slider

[![npm version](https://badge.fury.io/js/neutron-slider.svg)](https://badge.fury.io/js/neutron-slider)

A simple and lightweight jQuery slider plugin written in TypeScript.

## Installation

You can install Neutron Slider via npm or yarn.

```bash
# via npm
npm install neutron-slider

# via yarn
yarn add neutron-slider
```

## Usage

1.  Include the slider's CSS file in the `<head>` of your HTML file.
2.  Create your slider markup.
3.  Include jQuery and the slider's JavaScript file before the closing `</body>` tag.
4.  Initialize the slider on your target element.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neutron Slider Example</title>
    <link rel="stylesheet" href="dist/index.css">
</head>
<body>

    <div class="my-slider">
        <div><h3>1</h3></div>
        <div><h3>2</h3></div>
        <div><h3>3</h3></div>
        <div><h3>4</h3></div>
        <div><h3>5</h3></div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="dist/neutron-slider.js"></script>
    <script>
        $(document).ready(function(){
            $('.my-slider').neutronSlider({
                dots: true,
                centerMode: true,
                loop: true
            });
        });
    </script>
</body>
</html>
```

## Options

Customize the slider by passing an options object during initialization.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `slidesToShow` | `number` | `1` | Number of slides to show at once. |
| `slidesToScroll` | `number` | `1` | Number of slides to scroll at once. |
| `gap` | `number` | `0` | The space between slides in pixels. |
| `centerMode` | `boolean` | `false` | Enables center mode, which provides a preview of the next and previous slides. |
| `centerClass` | `string` | `'center-slide'` | CSS class for the centered slide in center mode. |
| `loop` | `boolean` | `true` | Enables infinite looping. |
| `initialSlide` | `number` | `0` | The slide to start on. |
| `duration` | `number` | `500` | Transition duration in milliseconds. |
| `autoplay` | `boolean` | `false` | Enables autoplay. |
| `autoplaySpeed` | `number` | `3000` | Autoplay speed in milliseconds. |
| `adaptiveHeight` | `boolean` | `false` | Adjusts the slider height to the current slide's height. |
| `accessibility` | `boolean` | `true` | Enables keyboard navigation and ARIA attributes. |
| `prevArrow` | `string \| JQuery \| null` | `null` | Custom previous arrow selector or jQuery object. |
| `nextArrow` | `string \| JQuery \| null` | `null` | Custom next arrow selector or jQuery object. |
| `dots` | `boolean` | `false` | Shows navigation dots. |
| `dotsClass` | `string` | `'neutron-dots'` | CSS class for the dots container. |
| `appendDots` | `string \| JQuery \| null` | `null` | Element to append the dots to. Defaults to the slider container. |
| `customPaging` | `(slider: NeutronSlider, i: number) => JQuery` | `function` | Custom paging function for the dots. Defaults to creating a `<button>` with the slide number. |
| `responsive` | `ResponsiveSettings[]` | `[]` | Array of objects for responsive settings. See example below. |
| `onInit` | `((slider: NeutronSlider) => void) \| null` | `null` | Callback after the slider is initialized. |
| `onBeforeChange` | `((oldSlide: number, newSlide: number) => void) \| null` | `null` | Callback before a slide changes. |
| `onAfterChange` | `((currentSlide: number) => void) \| null` | `null` | Callback after a slide changes. |
| `onDuringChange` | `((slider: NeutronSlider) => void) \| null` | `null` | Callback during a slide change. |

### Responsive Settings Example

The `responsive` option allows you to change settings at different breakpoints. The settings are applied when the window width is less than or equal to the `breakpoint`.

```javascript
$('.my-slider').neutronSlider({
    slidesToShow: 3,
    responsive: [
        {
            breakpoint: 768,
            settings: {
                slidesToShow: 2
            }
        },
        {
            breakpoint: 480,
            settings: {
                slidesToShow: 1
            }
        }
    ]
});
```

## Methods

You can call methods on an initialized slider instance using the plugin's syntax.

```javascript
const $slider = $('.my-slider');

// Go to the next slide
$slider.neutronSlider('next');

// Go to the previous slide
$slider.neutronSlider('prev');

// Go to a specific slide (e.g., slide 3)
$slider.neutronSlider('goTo', 2); // Note: index is zero-based

// Start autoplay
$slider.neutronSlider('startAutoplay');

// Stop autoplay
$slider.neutronSlider('stopAutoplay');
```

You can also get the slider instance from the element's data to call methods directly.
```javascript
const sliderInstance = $('.my-slider').data('neutronSlider');
sliderInstance.next();
```

## Development

To build the project from source:

1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Run the build script: `npm run build` (You may need to check `package.json` for the exact script name).

## License

This project is licensed under the MIT License.