#! /usr/bin/env node

const fs = require('fs');
const os = require('os');
const puppeteer = require('puppeteer');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const sharp = require("sharp");

const tmpdir = os.tmpdir();

// const gitHash = process.argv[2];
const url = process.argv[2];
const url2 = process.argv[3];

/*
if (!gitHash || !url) {
  throw new Error();
}
*/

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 780 })

  await page.goto(url);
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 3000 })
    .catch(e => console.log('timeout exceed. proceed to next operation'))
  await page.screenshot({ path: tmpdir + '/new.png', fullPage: true })

  await page.goto(url2);
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 3000 })
    .catch(e => console.log('timeout exceed. proceed to next operation'))
  await page.screenshot({ path: tmpdir + '/old.png', fullPage: true })

  await browser.close()

  const img1 = PNG.sync.read(fs.readFileSync(tmpdir + '/new.png'));
  const img2 = PNG.sync.read(fs.readFileSync(tmpdir + '/old.png'));

  const width = img1.width < img2.width ? img1.width : img2.width
  const height = img1.height < img2.height ? img1.height : img2.height

  await sharp(tmpdir + '/new.png').resize(width, height, { fit: 'cover', position: 'left top' }).toFile(tmpdir + '/new2.png')
  await sharp(tmpdir + '/old.png').resize(width, height, { fit: 'cover', position: 'left top' }).toFile(tmpdir + '/old2.png')

  const img1_2 = PNG.sync.read(fs.readFileSync(tmpdir + '/new2.png'));
  const img2_2 = PNG.sync.read(fs.readFileSync(tmpdir + '/old2.png'));

  const diff = new PNG({ width, height });

  pixelmatch(img1_2.data, img2_2.data, diff.data, width, height, { threshold: 0.1 });

  const options = { colorType: 6 };
  const buffer1 = PNG.sync.write(img1_2, options);
  const buffer2 = PNG.sync.write(img2_2, options);
  const buffer3 = PNG.sync.write(diff, options);

  const compositeParams = [
    {
      input: './img/latest.png',
      gravity: "northwest",
      left: 0,
      top: 0
    },
    {
      input: './img/diff.png',
      gravity: "northwest",
      left: width,
      top: 0
    },
    {
      input: './img/old.png',
      gravity: "northwest",
      left: width * 2,
      top: 0
    },
    {
      input: buffer1,
      gravity: "northwest",
      left: 0,
      top: 100
    },
    {
      input: buffer3,
      gravity: "northwest",
      left: width,
      top: 100
    },
    {
      input: buffer2,
      gravity: "northwest",
      left: width * 2,
      top: 100
    }
  ]

  sharp({
    create: {
      width: width * 3,
      height: height + 100,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    }
  })
    .composite(compositeParams)
    .toFile("diff.png");

  // fs.writeFileSync('diff.png', PNG.sync.write(diff));
})();

