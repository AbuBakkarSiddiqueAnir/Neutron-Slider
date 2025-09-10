# te-slider

A simple and lightweight jQuery slider plugin written in TypeScript.

## Installation

```bash
npm install te-slider
```

## Usage

Include jQuery and the plugin's JavaScript and CSS files in your HTML:

```html
<head>
    <link rel="stylesheet" href="dist/te-slider.css">
</head>
<body>
    <div class="my-slider">
        <div>Slide 1</div>
        <div>Slide 2</div>
        <div>Slide 3</div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="dist/te-slider.js"></script>
    <script>
        $(document).ready(function(){
            $('.my-slider').teSlider();
        });
    </script>
</body>
```

## Options

You can pass an options object to the `teSlider` function to customize the slider.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `slidesToShow` | `number` | `1` | Number of slides to show at once. |
| `slidesToScroll` | `number` | `1` | Number of slides to scroll at once. |
| `centerMode` | `boolean` | `false` | Enables center mode, which provides a preview of the next and previous slides. |
| `autoplay` | `boolean` | `false` | Enables autoplay. |
| `autoplaySpeed` | `number` | `3000` | Autoplay speed in milliseconds. |
| `duration` | `number` | `500` | Transition duration in milliseconds. |
| `responsive` | `ResponsiveSettings[]` | `[]` | Array of objects for responsive settings. See below for an example. |
| `prevArrow` | `string | JQuery | null` | `null` | Custom previous arrow selector or jQuery object. |
| `nextArrow` | `string | JQuery | null` | `null` | Custom next arrow selector or jQuery object. |
| `loop` | `boolean` | `true` | Enables infinite looping. |
| `dots` | `boolean` | `false` | Shows navigation dots. |
| `dotsClass` | `string` | `'te-dots'` | CSS class for the dots container. |
| `appendDots` | `string | JQuery | null` | `null` | Element to append the dots to. Defaults to the slider container. |
| `customPaging` | `(slider: TeSlider, i: number) => JQuery` | `...` | Custom paging function for the dots. |
| `accessibility` | `boolean` | `true` | Enables keyboard navigation and ARIA attributes. |
| `adaptiveHeight` | `boolean` | `false` | Adjusts the slider height to the current slide's height. |
| `fade` | `boolean` | `false` | Enables fade transition instead of sliding. |
| `initialSlide` | `number` | `0` | The slide to start on. |
| `centerClass` | `string` | `'scaled'` | CSS class for the centered slide in center mode. |
| `onInit` | `((slider: TeSlider) => void) | null` | `null` | Callback function after the slider is initialized. |
| `onBeforeChange` | `((oldSlide: number, newSlide: number) => void) | null` | `null` | Callback function before a slide changes. |
| `onAfterChange` | `((currentSlide: number) => void) | null` | `null` | Callback function after a slide changes. |
| `onDuringChange` | `((slider: TeSlider) => void) | null` | `null` | Callback function during a slide change. |

### Responsive Settings Example

```javascript
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
```

## Methods

You can call methods on the slider instance.

```javascript
const slider = $('.my-slider').data('teSlider');

// Go to a specific slide
slider.publicGoTo(2);

// Go to the next slide
slider.next();

// Go to the previous slide
slider.prev();

// Start autoplay
slider.startAutoplay();

// Stop autoplay
slider.stopAutoplay();
```
