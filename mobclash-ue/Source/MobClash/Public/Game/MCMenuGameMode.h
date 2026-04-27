#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "MCMenuGameMode.generated.h"

/**
 * Lightweight menu GameMode used by the main-menu map.
 */
UCLASS()
class MOBCLASH_API AMCMenuGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	AMCMenuGameMode();
};
