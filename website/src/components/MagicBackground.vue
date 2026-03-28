<template>
  <div class="magic-bg" aria-hidden="true">
    <div class="stars stars-small"></div>
    <div class="stars stars-medium"></div>
    <div class="stars stars-large"></div>
    <div class="vignette"></div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.magic-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 0%, #1a1040 0%, #0b0b1a 60%, #050510 100%);
}

/* Star layers using box-shadow for many tiny dots */
.stars {
  position: absolute;
  inset: 0;
  animation: drift 120s linear infinite;
}

.stars-small {
  width: 1px;
  height: 1px;
  background: transparent;
  box-shadow:
    42px 18px #ffffff44, 130px 60px #ffffff33, 218px 92px #ffffff55,
    315px 25px #ffffff22, 420px 130px #ffffff44, 520px 45px #ffffff33,
    610px 180px #ffffff22, 725px 70px #ffffff44, 50px 250px #ffffff33,
    160px 310px #ffffff22, 280px 200px #ffffff55, 390px 350px #ffffff33,
    500px 280px #ffffff44, 630px 320px #ffffff22, 740px 210px #ffffff33,
    80px 420px #ffffff22, 200px 480px #ffffff44, 340px 440px #ffffff33,
    480px 510px #ffffff22, 590px 460px #ffffff55, 710px 500px #ffffff33,
    30px 600px #ffffff22, 150px 650px #ffffff44, 270px 590px #ffffff33,
    400px 670px #ffffff22, 550px 620px #ffffff44, 680px 700px #ffffff33,
    100px 780px #ffffff22, 220px 750px #ffffff44, 370px 820px #ffffff33,
    510px 760px #ffffff22, 650px 830px #ffffff55, 760px 780px #ffffff33,
    45px 900px #ffffff22, 180px 870px #ffffff44, 320px 940px #ffffff33,
    460px 880px #ffffff22, 600px 950px #ffffff44, 730px 890px #ffffff33;
  animation: twinkle-small 4s ease-in-out infinite alternate;
}

.stars-medium {
  width: 2px;
  height: 2px;
  background: transparent;
  box-shadow:
    90px 45px #ffffff66, 240px 120px #ffffff55, 400px 80px #ffffff77,
    560px 200px #ffffff55, 700px 150px #ffffff66, 120px 340px #ffffff55,
    310px 280px #ffffff77, 490px 380px #ffffff55, 650px 440px #ffffff66,
    70px 520px #ffffff55, 250px 600px #ffffff77, 430px 550px #ffffff55,
    620px 620px #ffffff66, 180px 740px #ffffff55, 380px 700px #ffffff77,
    550px 800px #ffffff55, 730px 740px #ffffff66, 100px 880px #ffffff55,
    300px 850px #ffffff77, 500px 920px #ffffff55, 680px 870px #ffffff66;
  animation: twinkle-medium 5s ease-in-out infinite alternate;
}

.stars-large {
  width: 2.5px;
  height: 2.5px;
  border-radius: 50%;
  background: transparent;
  box-shadow:
    180px 90px rgba(212, 168, 67, 0.6), 450px 200px rgba(155, 109, 255, 0.5),
    650px 350px rgba(212, 168, 67, 0.5), 320px 500px rgba(155, 109, 255, 0.6),
    100px 650px rgba(212, 168, 67, 0.5), 550px 750px rgba(155, 109, 255, 0.5),
    700px 100px rgba(212, 168, 67, 0.6), 250px 850px rgba(155, 109, 255, 0.5);
  animation: twinkle-large 3s ease-in-out infinite alternate;
}

.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 40%,
    rgba(5, 5, 16, 0.6) 100%
  );
}

@keyframes twinkle-small {
  from { opacity: 1; }
  to { opacity: 0.5; }
}

@keyframes twinkle-medium {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

@keyframes twinkle-large {
  from { opacity: 0.5; transform: scale(1); }
  to { opacity: 1; transform: scale(1.3); }
}

@keyframes drift {
  from { transform: translateY(0); }
  to { transform: translateY(-20px); }
}
</style>
