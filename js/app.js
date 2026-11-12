(function () {
  'use strict';

  const LOGO = 'assets/logo.png';
  // 캐릭터 기본 그림. 문항에 "image" 값을 넣으면 그 문항만 다른 그림을 쓴다(상황별 그림이 완성되면 사용).
  const CHARACTER = 'assets/character/dog.png';
  const START_SCENE = { bubble: '안녕! 나랑 딱 맞는 책 찾으러 갈래?', mood: 'wave' };
  const RESULT_SCENE = { bubble: '찾았다! 너에게 어울리는 책!', mood: 'excited' };

  const app = document.getElementById('app');
  let questions = [];
  let indicators = [];
  let types = [];
  let answers = [];

  // 태그 생성 도우미. 내용은 항상 textContent로 넣어 데이터가 HTML로 해석되지 않게 한다.
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function show(...nodes) {
    app.replaceChildren(...nodes);
    window.scrollTo(0, 0);
  }

  // 이미지를 넣고, 파일이 없거나 불러오지 못하면 대체 요소로 바꾼다.
  function imageOr(src, alt, className, fallback) {
    if (!src) return fallback;
    const img = el('img', className);
    img.src = src;
    img.alt = alt;
    img.addEventListener('error', () => img.replaceWith(fallback));
    return img;
  }

  // 캐릭터와 말풍선. mood에 따라 움직임이 달라진다(wave, look, think, sad, excited).
  function scene({ image, bubble, mood }, small) {
    const figure = el('figure', `scene mood-${mood || 'look'}${small ? ' scene-small' : ''}`);
    if (bubble) figure.append(el('figcaption', 'bubble', bubble));
    figure.append(imageOr(image || CHARACTER, '', 'art', el('div', 'art art-empty', '캐릭터 이미지 자리')));
    return figure;
  }

  function logo(className) {
    const img = el('img', className);
    img.src = LOGO;
    img.alt = '구로천왕도서관';
    img.addEventListener('error', () => img.remove());
    return img;
  }

  function renderStart() {
    answers = [];
    const wrap = el('section', 'start');
    wrap.append(logo('logo'));
    const body = el('div', 'start-body');
    body.append(
      el('p', 'start-sub', 'MBTI 성격유형별 추천도서'),
      el('h1', 'start-title', 'BBTI'),
      scene(START_SCENE),
      el('p', 'start-desc', `${questions.length}개의 질문으로 나에게 맞는 책을 찾아보세요`)
    );
    const start = el('button', 'btn-primary', '시작하기');
    start.type = 'button';
    start.addEventListener('click', renderQuestion);
    wrap.append(body, start);
    show(wrap);
    start.focus({ preventScroll: true });
  }

  function renderQuestion() {
    const index = answers.length;
    const q = questions[index];

    const back = el('button', 'back', '←');
    back.type = 'button';
    back.setAttribute('aria-label', '이전으로');
    back.addEventListener('click', () => {
      if (answers.length === 0) return renderStart();
      answers.pop();
      renderQuestion();
    });

    const progress = el('div', 'progress');
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-valuemin', '0');
    progress.setAttribute('aria-valuemax', String(questions.length));
    progress.setAttribute('aria-valuenow', String(index + 1));
    const bar = el('div', 'progress-bar');
    bar.style.width = `${((index + 1) / questions.length) * 100}%`;
    progress.append(bar);

    const top = el('div', 'topbar');
    top.append(back, progress, el('span', 'count', `${index + 1}/${questions.length}`));

    const options = el('div', 'options');
    q.options.forEach((option) => {
      const button = el('button', 'option', option.text);
      button.type = 'button';
      button.addEventListener('click', () => {
        answers.push(option.letter);
        if (answers.length === questions.length) renderResult(calcType());
        else renderQuestion();
      });
      options.append(button);
    });

    show(top, el('p', 'q-no', `Q${index + 1}.`), scene(q), el('h2', 'q-text', q.text), options);
  }

  // 지표마다 A쪽 글자를 센 뒤, 문항의 과반이면 A쪽, 아니면 B쪽 글자를 고른다.
  function calcType() {
    return indicators.map((ind) => {
      const countA = answers.filter((letter) => letter === ind.A).length;
      return countA * 2 > ind.questions.length ? ind.A : ind.B;
    }).join('');
  }

  function safeUrl(url) {
    try {
      const parsed = new URL(url, location.href);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
    } catch (e) {
      return null;
    }
  }

  function bookCard(book, isLastOdd) {
    const card = el('article', isLastOdd ? 'book book-3rd' : 'book');
    const cover = imageOr(book.cover, `${book.title} 표지`, 'cover', el('div', 'cover cover-empty', '표지 준비 중'));
    const url = safeUrl(book.ebookUrl);
    if (book.ebookUrl && url) {
      const link = el('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `${book.title} 전자책 읽기`);
      link.append(cover);
      card.append(link);
    } else {
      card.append(cover);
    }
    if (book.category) card.append(el('p', 'book-cat', `#${book.category}`));
    card.append(el('p', 'book-title', book.title));
    if (book.author) card.append(el('p', 'book-meta', book.author));
    if (book.callNumber) card.append(el('p', 'book-meta', `청구기호 ${book.callNumber}`));
    return card;
  }

  function renderResult(code) {
    const type = types.find((t) => t.code === code);
    if (!type) return renderMessage(`결과 유형(${code})을 찾지 못했어요.`);

    const card = el('section', 'card');
    card.append(
      scene(RESULT_SCENE, true),
      el('p', 'r-label', '나의 BBTI는'),
      el('h1', 'r-code', type.code),
      el('p', 'r-title', type.title)
    );
    if (type.tagline) card.append(el('p', 'r-tagline', type.tagline));
    card.append(el('p', 'r-comment', type.comment));

    const hashtags = type.hashtags || [];
    if (hashtags.length) {
      const list = el('ul', 'tags');
      hashtags.forEach((tag) => list.append(el('li', '', `#${String(tag).replace(/^#/, '')}`)));
      card.append(list);
    }

    card.append(el('h2', 'books-title', type.bookPrompt || '추천 도서'));
    if (type.genre) card.append(el('p', 'genre', `추천 장르 · ${type.genre}`));
    const books = type.books || [];
    if (books.length) {
      const grid = el('div', 'books');
      books.forEach((book, i) => grid.append(bookCard(book, books.length % 2 === 1 && i === books.length - 1)));
      card.append(grid);
      if (books.some((book) => safeUrl(book.ebookUrl) && book.ebookUrl)) {
        card.append(el('p', 'ebook-note', '도서 표지를 누르면 전자책으로 읽을 수 있어요!'));
      }
    } else {
      card.append(el('p', 'books-empty', '추천 도서를 준비하고 있어요.'));
    }

    const retry = el('button', 'btn-primary retry', '테스트 다시 하기');
    retry.type = 'button';
    retry.addEventListener('click', renderStart);
    show(card, retry, logo('logo logo-small'));
  }

  function renderMessage(text) {
    show(el('p', 'message', text));
  }

  async function loadJson(path) {
    // 문항·도서를 고쳐 다시 배포했을 때 예전 데이터가 남지 않도록 매번 서버에 최신 여부를 확인한다.
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  }

  async function init() {
    try {
      const [questionData, typeData] = await Promise.all([
        loadJson('data/questions.json'),
        loadJson('data/types.json'),
      ]);
      questions = questionData.questions;
      indicators = questionData.scoring.indicators;
      types = typeData.types;
      renderStart();
    } catch (error) {
      console.error(error);
      renderMessage('테스트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }

  init();
})();
