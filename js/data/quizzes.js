/*
 * QUIZ QUESTIONS (3 are picked at random after each level).
 *
 * ✏️  Each question has:
 *   q       — the question
 *   options — the possible answers (2 to 4)
 *   answer  — the number of the correct option, counting from 0
 *             (0 = first option, 1 = second option, …)
 *   why     — a short explanation shown after answering
 *
 * Answers are shuffled in the game, so you can always put the correct
 * one wherever you like.
 */
DR.QUIZZES = {
  earthquake: [
    {
      q: 'The ground starts shaking while you are in class. What should you do first?',
      options: ['Run outside', 'Drop, Cover and Hold On under a sturdy desk', 'Stand next to the window', 'Go down the stairs'],
      answer: 1,
      why: 'Drop, Cover and Hold On protects you from falling objects. Moving around during shaking can make you fall or get hit.'
    },
    {
      q: 'Which places should you stay away from during an earthquake?',
      options: ['Under a sturdy table', 'Windows, tall shelves and hanging lights', 'An open field', 'Next to an inside wall'],
      answer: 1,
      why: 'Glass can break, and shelves and lights can fall or swing.'
    },
    {
      q: 'The shaking has stopped. Where should your class gather?',
      options: ['Under a big tree', 'Right next to the school building', 'In an open area away from buildings, trees and power lines', 'Near the power lines in the car park'],
      answer: 2,
      why: 'An open area keeps you safe from anything that might fall during aftershocks.'
    },
    {
      q: 'What is an aftershock?',
      options: ['A warning siren', 'A smaller earthquake that can follow the main one', 'A big wave', 'The sign that an earthquake is over'],
      answer: 1,
      why: 'Aftershocks can happen minutes, days or even months later — be ready to Drop, Cover and Hold On again.'
    },
    {
      q: 'Why should you not use a lift after an earthquake?',
      options: ['Lifts are slower than stairs', 'The lift could stop working and trap you', 'Lifts are only for teachers', 'There is no reason'],
      answer: 1,
      why: 'Power cuts and damage can stop lifts. Use the stairs once the shaking has stopped.'
    }
  ],
  flood: [
    {
      q: 'A path ahead is covered with moving floodwater. What should you do?',
      options: ['Walk through it slowly', 'Turn around and find another way', 'Ride a bike through quickly', 'Swim across'],
      answer: 1,
      why: '"Turn around, don\'t drown!" Floodwater can be deeper and faster than it looks.'
    },
    {
      q: 'How deep does fast-moving water need to be to knock a person over?',
      options: ['Only about 15 cm (ankle to knee deep)', 'At least 1 metre', 'At least 2 metres', 'Moving water can\'t knock you over'],
      answer: 0,
      why: 'Just 15 cm of fast-moving water can sweep you off your feet.'
    },
    {
      q: 'Before leaving home in a flood, what should you do if it is safe?',
      options: ['Take the TV with you', 'Switch off the main electricity', 'Open all the windows', 'Wait for the water to come inside'],
      answer: 1,
      why: 'Switching off the power (only if you are dry) helps prevent electric shocks and fires.'
    },
    {
      q: 'Where should you go when floodwater is rising?',
      options: ['Down into a basement', 'To higher ground, like a hill', 'To the riverbank to watch', 'Into an underpass'],
      answer: 1,
      why: 'Water flows to low places, so higher ground keeps you safe.'
    },
    {
      q: 'You see a fallen power line near the floodwater. What should you do?',
      options: ['Move it with a stick', 'Stay far away and tell an adult or emergency services', 'Step over it carefully', 'Touch it to see if it works'],
      answer: 1,
      why: 'Fallen power lines can still be live, and water can carry electricity. Keep well away.'
    }
  ],
  heatwave: [
    {
      q: 'What is the best drink to stay hydrated in a heatwave?',
      options: ['Fizzy drinks', 'Water', 'Energy drinks', 'Very sweet juice'],
      answer: 1,
      why: 'Water is best. Sip it regularly through the day.'
    },
    {
      q: 'Someone in the heat is dizzy and confused. What should you do?',
      options: ['Let them keep walking', 'Move them to shade, call for help and cool them down', 'Tell them to run home', 'Give them a hot drink'],
      answer: 1,
      why: 'These are signs of heatstroke, a medical emergency. Get help fast and cool them down.'
    },
    {
      q: 'When is the sun usually strongest?',
      options: ['Early morning', 'About 11 am to 3 pm', 'Late evening', 'At night'],
      answer: 1,
      why: 'Try to stay in the shade and avoid hard exercise in the middle of the day.'
    },
    {
      q: 'Which clothes are best on a very hot day?',
      options: ['Dark, tight clothes', 'Light-coloured, loose clothes and a hat', 'A thick jacket', 'A woolly jumper'],
      answer: 1,
      why: 'Light colours reflect sunlight and loose clothes let your skin breathe.'
    },
    {
      q: 'Why should you avoid running in the midday sun during a heatwave?',
      options: ['It is boring', 'Your body heats up fast and you could get heat illness', 'Your shoes might melt', 'It makes you hungry'],
      answer: 1,
      why: 'Hard exercise makes heat in your body. In hot weather it is hard to cool down again.'
    }
  ],
  storm: [
    {
      q: 'Before a cyclone, what should you do with garden furniture and bins?',
      options: ['Leave them where they are', 'Tie them down or bring them inside', 'Put them next to the windows', 'Put them on the roof'],
      answer: 1,
      why: 'Strong winds can throw loose objects through windows or at people.'
    },
    {
      q: 'Where is the safest place in a house during a storm?',
      options: ['Next to a big window', 'A small inner room with no windows', 'On the porch', 'In the garden shed'],
      answer: 1,
      why: 'Inner rooms have more walls between you and the wind, and no glass to break.'
    },
    {
      q: 'In the middle of a cyclone the wind suddenly stops. What does it probably mean?',
      options: ['The storm is over', 'It is the eye of the storm — the wind will come back', 'It is time to play outside', 'It is time to fix the roof'],
      answer: 1,
      why: 'The calm eye passes quickly, then strong winds return. Stay inside until officials say it is over.'
    },
    {
      q: 'How should you know when to evacuate?',
      options: ['Guess by looking at the clouds', 'Follow official alerts on radio, TV or emergency apps', 'Wait until water reaches the door', 'Ask a friend online'],
      answer: 1,
      why: 'Officials know which areas are in danger. Leave when they tell you to.'
    },
    {
      q: 'Why is a torch better than candles during a power cut?',
      options: ['Candles are too bright', 'Candles can start a fire', 'Torches are prettier', 'Candles are noisy'],
      answer: 1,
      why: 'A fire is the last thing you need during a storm. Keep a torch and spare batteries in your kit.'
    }
  ]
};
