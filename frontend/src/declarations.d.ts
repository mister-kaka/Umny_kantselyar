declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}


// говорим TypeScript "CSS-файлы существуют, не ругайся на их импорт"
// !! без этого TypeScript не понимает, что можно импортировать .css файлы