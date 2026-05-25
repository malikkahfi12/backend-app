import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  FeedFormat,
  FeedSourceType,
  OperatorType,
  PrismaClient,
} from '@prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main(): Promise<void> {
  const indonesia = await prisma.country.upsert({
    where: { code: 'ID' },
    update: { name: 'Indonesia' },
    create: {
      code: 'ID',
      name: 'Indonesia',
    },
  });

  const jakarta = await prisma.region.upsert({
    where: {
      countryId_code: {
        countryId: indonesia.id,
        code: 'JKT',
      },
    },
    update: {
      name: 'Jakarta',
      timezone: 'Asia/Jakarta',
      defaultLocale: 'id-ID',
    },
    create: {
      countryId: indonesia.id,
      code: 'JKT',
      name: 'Jakarta',
      timezone: 'Asia/Jakarta',
      defaultLocale: 'id-ID',
    },
  });

  const transitModes = await Promise.all(
    [
      ['MRT', 'MRT'],
      ['LRT', 'LRT'],
      ['BRT', 'Bus Rapid Transit'],
      ['COMMUTER_RAIL', 'Commuter Rail'],
      ['BUS', 'Bus'],
      ['MICROBUS', 'Microbus'],
      ['KRL', 'Kereta Rel Listrik'],
      ['MIKROTRANS', 'Mikrotrans'],
      ['WALK', 'Walking'],
      ['UNKNOWN', 'Unknown'],
      ['rail', 'Rail'],
      ['subway', 'Subway'],
      ['light_rail', 'Light Rail'],
      ['tram', 'Tram'],
      ['bus', 'Bus'],
    ].map(([code, name]) =>
      prisma.transitMode.upsert({
        where: { code },
        update: { name },
        create: { code, name },
      }),
    ),
  );

  const modeByCode = new Map(transitModes.map((mode) => [mode.code, mode]));
  const operators = [
    {
      code: 'TRANSJAKARTA',
      name: 'TransJakarta',
      type: OperatorType.GOVERNMENT,
      modeCode: 'BRT',
    },
  ];

  for (const operatorInput of operators) {
    const operator = await prisma.operator.upsert({
      where: {
        regionId_code: {
          regionId: jakarta.id,
          code: operatorInput.code,
        },
      },
      update: {
        name: operatorInput.name,
        type: operatorInput.type,
      },
      create: {
        regionId: jakarta.id,
        code: operatorInput.code,
        name: operatorInput.name,
        type: operatorInput.type,
      },
    });
    const transitMode = modeByCode.get(operatorInput.modeCode);

    if (transitMode) {
      await prisma.operatorTransitMode.upsert({
        where: {
          operatorId_transitModeId: {
            operatorId: operator.id,
            transitModeId: transitMode.id,
          },
        },
        update: {},
        create: {
          operatorId: operator.id,
          transitModeId: transitMode.id,
        },
      });
    }

    await prisma.feedSource.upsert({
      where: {
        operatorId_type_name: {
          operatorId: operator.id,
          type: FeedSourceType.GTFS_STATIC,
          name: `${operatorInput.name} GTFS Static`,
        },
      },
      update: {
        format: FeedFormat.GTFS_ZIP,
        url: null,
        isActive: true,
      },
      create: {
        operatorId: operator.id,
        type: FeedSourceType.GTFS_STATIC,
        name: `${operatorInput.name} GTFS Static`,
        format: FeedFormat.GTFS_ZIP,
        url: null,
        isActive: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
