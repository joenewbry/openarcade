#pragma once

#include "CoreMinimal.h"
#include "Data/MCSettingsData.h"
#include "GameFramework/SaveGame.h"
#include "MCSettingsSaveGame.generated.h"

/**
 * SaveGame container for persisted player settings.
 */
UCLASS()
class MOBCLASH_API UMCSettingsSaveGame : public USaveGame
{
	GENERATED_BODY()

public:
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings")
	FMCPlayerSettingsData Settings;
};
