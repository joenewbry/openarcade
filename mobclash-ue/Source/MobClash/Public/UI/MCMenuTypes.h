#pragma once

#include "CoreMinimal.h"
#include "MCMenuTypes.generated.h"

/**
 * High-level menu destinations for the MobClash frontend shell.
 */
UENUM(BlueprintType)
enum class EMCMenuScreen : uint8
{
	Main UMETA(DisplayName = "Main"),
	Roster UMETA(DisplayName = "Roster"),
	Progress UMETA(DisplayName = "Progress"),
	Settings UMETA(DisplayName = "Settings"),
	PlayBoard UMETA(DisplayName = "Play (Board)")
};
